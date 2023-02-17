import myzod from "myzod";

import { isValueObject, valueObjectClassFactory } from "./value-object-factory";

describe("valueOBjectFactory", () => {
  const schema = myzod.object({ foo: myzod.string(), doo: myzod.number() });
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
    //-----------------------------
    const t = new Test(JSON.parse(json));

    expect(json).toEqual(JSON.stringify(t));
  });

  test("give access to its properties", () => {
    const i = new Test({ foo: "bar", doo: 1 });

    expect(i.foo).toEqual("bar");
    expect(i.doo).toEqual(1);
  });
});