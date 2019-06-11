import { Injector } from "injection-js";
import { BaseMicroService } from "./base";
import { IConstructor } from "./lang";
import { Runner } from "./runner";

type BoxedTupleTypes<T extends BaseMicroService[]> = { [P in keyof T]: T[P] }[Exclude<keyof T, keyof any[]>];
type ConstructorsTuple<T extends BoxedTupleTypes<any>> = { [P in keyof T]: InstanceType<T[P]> };
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;
type ConstructorWithInjector<T> = new (injector: Injector) => BaseMicroService & T;
// tslint:disable-next-line:max-line-length
type IntersectionTypes<S extends any[]> = ConstructorWithInjector<UnionToIntersection<BoxedTupleTypes<ConstructorsTuple<S>>>>;

export function ServiceMix<S extends any[]>(...serviceClasses: S): IntersectionTypes<S> {
  const base = class extends BaseMicroService {
    public static components: Array<IConstructor<any>> = [];
    constructor(injector: Injector) {
      super(injector.get(Runner));
      serviceClasses.forEach((serviceClass) => {
        Object.assign(this, injector.get(serviceClass));
      });
    }
  };

  serviceClasses.forEach((serviceClass) => {
    Object.getOwnPropertyNames(serviceClass.prototype).forEach((name) => {
      const baseDesc = Object.getOwnPropertyDescriptor(serviceClass.prototype, name);
      if (baseDesc && name !== "constructor") {
        Object.defineProperty(base.prototype, name, baseDesc);
      }
    });

    base.components.push(serviceClass.prototype.constructor);
  });

  return base as any;
}
