import "reflect-metadata";
import { expectType } from "ts-expect";
import { Inject, Injectable, InjectionToken, ReflectiveInjector } from "injection-js";
import { dependencyBundleFactory } from "./dependency-manager";

describe("Dependency bundles", () => {
  test("creates dependency bundle", () => {
    const someDep = new InjectionToken<string>("description1");

    class DependencyBundle extends dependencyBundleFactory({ someLOL: someDep }) {}
    const dependencyBundle = DependencyBundle.provide("someLOL").asValue("Foo").seal();

    const injector = ReflectiveInjector.resolveAndCreate(dependencyBundle);
    const bundle = injector.get(DependencyBundle) as DependencyBundle;

    expectType<string>(bundle.someLOL);
    expect(dependencyBundle[0]).toStrictEqual({ provide: someDep, useValue: "Foo" });
    expect(bundle.someLOL).toStrictEqual("Foo");
  });

  test("creates a dependency bundle with values, classes and factories", () => {
    class SomeClass {
      public readonly FQN = "SomeClass";
    }

    class FooClass {
      public readonly FQN = "FooClass";
      constructor(public lol: string) {}
    }

    const someDep = new InjectionToken<string>("description1");
    const someOtherDep = new InjectionToken<number>("description2");
    const yetAnotherDep = new InjectionToken<SomeClass>("description3");
    const stillAnotherDep = new InjectionToken<FooClass>("description4");

    class DependencyBundle extends dependencyBundleFactory({
      someDep,
      someOtherDep,
      yetAnotherDep,
      stillAnotherDep,
    }) {}

    const dependencyBundle = DependencyBundle.provide("someDep")
      .asValue("Foo")
      .provide("someOtherDep")
      .asValue(12)
      .provide("yetAnotherDep")
      .asClass(SomeClass)
      .provide("stillAnotherDep")
      .asFactory(x => new FooClass(`${x}LOL`), [someDep])
      .seal();

    const injector = ReflectiveInjector.resolveAndCreate(dependencyBundle);
    const bundle = injector.get(DependencyBundle) as DependencyBundle;

    type ExpectedBundleType = {
      someDep: string;
      someOtherDep: number;
      yetAnotherDep: SomeClass;
      stillAnotherDep: FooClass;
    };

    expectType<ExpectedBundleType>(bundle);
    expect(bundle.someDep).toStrictEqual("Foo");
    expect(bundle.someOtherDep).toStrictEqual(12);
    expect(bundle.yetAnotherDep).toBeInstanceOf(SomeClass);
    expect(bundle.yetAnotherDep.FQN).toStrictEqual("SomeClass");
    expect(bundle.stillAnotherDep).toBeInstanceOf(FooClass);
    expect(bundle.stillAnotherDep.FQN).toStrictEqual("FooClass");
    expect(bundle.stillAnotherDep.lol).toStrictEqual("FooLOL");
  });

  test("handle nested bundles", () => {
    const param = new InjectionToken<string>("param");
    const class1Token = new InjectionToken<Class1>("Class1");
    const class2Token = new InjectionToken<Class2>("Class2");

    class Class1 {
      public prop = "class1";
    }

    class Dep1 extends dependencyBundleFactory({ p: param, c: class1Token }) {}
    const dep1 = Dep1.provide("p").asValue("foo").provide("c").asClass(Class1).seal();

    @Injectable()
    class Class2 {
      public prop = "class2";
      constructor(public dep: Dep1) {}
    }

    class Dep2 extends dependencyBundleFactory({ c: class2Token }) {}
    const dep2 = Dep2.provide("c").asClass(Class2).seal();

    @Injectable()
    class Service {
      constructor(public dep: Dep2) {}
    }

    const injector = ReflectiveInjector.resolveAndCreate([dep2, dep1, Service]);
    const service = injector.get(Service) as Service;

    expect(service.dep.c).toBeInstanceOf(Class2);
    expect(service.dep.c.prop).toStrictEqual("class2");
    expect(service.dep.c.dep.p).toStrictEqual("foo");
    expect(service.dep.c.dep.c).toBeInstanceOf(Class1);
    expect(service.dep.c.dep.c.prop).toStrictEqual("class1");
  });

  test("bundle is injectable into a service", () => {
    const configInjector = new InjectionToken<string>("Config");
    const otherConfigInjector = new InjectionToken<number>("Config");
    const depClassInjector = new InjectionToken<DepClass>("DepClass");

    class DepClass {
      constructor(@Inject(configInjector) public config: string) {}
      public sayHi(): string {
        return "hi";
      }
    }

    @Injectable()
    class SomeDeps extends dependencyBundleFactory({
      service: depClassInjector,
      config: configInjector,
      timestamp: otherConfigInjector,
    }) {}

    const someDeps = SomeDeps.provide("service")
      .asClass(DepClass)
      .provide("config")
      .asValue("xyz")
      .provide("timestamp")
      .asFactory(() => new Date().getTime(), [])
      .seal();

    @Injectable()
    class SomeService {
      public readonly foo = "bar";
      constructor(public deps: SomeDeps) {}
    }

    const injector = ReflectiveInjector.resolveAndCreate([someDeps, SomeService]);

    const service = injector.get(SomeService) as SomeService;

    expect(service.foo).toStrictEqual("bar");
    expect(service.deps.config).toStrictEqual("xyz");
    expect(typeof service.deps.timestamp).toStrictEqual("number");
    expect(service.deps.timestamp).toBeGreaterThan(0);
    expect(service.deps.service.config).toStrictEqual("xyz");
    expect(service.deps.service.sayHi()).toStrictEqual("hi");
  });
});
