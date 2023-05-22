import "reflect-metadata";
import z from "myzod";
import { errorObjectClassFactory } from "../errors";
import { CoreNamingService } from "../runner";

import { Register } from "./register";
import { isValueObject, valueObjectClassFactory } from "./value-object-factory";

describe("ValueObject behavior", () => {
  const schema = z.object({ foo: z.string(), doo: z.number() });
  @Register
  class Test extends valueObjectClassFactory("Core::ValueObject::Test", schema) {}

  test("setup discriminator key", () => {
    const x = { foo: "uuu", doo: 1212 };
    const i = new Test(x);
    expect(i.FQN).toEqual("Core::ValueObject::Test");
    expect(isValueObject(i)).toEqual(true);
  });

  test("throw on validation error", () => {
    try {
      // @ts-expect-error we willfully pass invalid data
      new Test({ foo: 1 });
      expect(false);
    } catch (e) {
      expect(true);
    }
  });

  test("accept DTO wrapped values", () => {
    const i = new Test({ foo: "bar", doo: 12 });
    const json = JSON.stringify(i);
    const t = new Test(JSON.parse(json));

    expect(json).toEqual(JSON.stringify(t));
  });

  test("exposes its values through value()", () => {
    const input = { foo: "bar", doo: 12 };
    const i = new Test(input);
    const value = i.value();

    expect(value).toMatchObject(input);
  });

  test("give access to its properties", () => {
    const i = new Test({ foo: "bar", doo: 1 });

    expect(i.foo).toEqual("bar");
    expect(i.doo).toEqual(1);
  });

  test("constructor holds it validator", () => {
    const i = new Test({ foo: "bar", doo: 1 });

    expect(i.validator()).toMatchObject(schema);
  });

  test("validates nested value objects", () => {
    const schema = z.object({
      foo: z.string(),
      doo: z.number(),
      nested: Test.schema(),
    });

    @Register
    class Test2 extends valueObjectClassFactory("Core::ValueObject::Test2", schema) {}

    const i = new Test2({
      foo: "bar",
      doo: 1,
      nested: new Test({ foo: "baz", doo: 2 }),
    });

    expect(i.nested).toBeInstanceOf(Test);
  });

  test("Error value object", () => {
    @Register
    class TestError extends errorObjectClassFactory("Core::ValueObject::Error::TestError", schema) {}
    const i = new TestError({ foo: "bar", doo: 1 });

    expect(i).toBeInstanceOf(TestError);
    expect(i).toBeInstanceOf(Error);
  });

  test("does register only ValueObject classes", () => {
    @Register
    class NotVO {
      static readonly FQN = "Core::ValueObject::NotVO";
    }

    expect(() => CoreNamingService.getValueObjectConstructor(NotVO.FQN)).toThrowError();
    expect(CoreNamingService.getValueObjectConstructor(Test.FQN)).toEqual(Test);
  });
});
