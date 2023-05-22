import "reflect-metadata";
import z from "myzod";
import { Register } from "../value-object/register";
import { isValueObject } from "../value-object/value-object-factory";
import { errorObjectClassFactory } from "./error";
import { expectType } from "ts-expect";
import { ValueObject, ValueObjectConstructor } from "../value-object";
import { ErrorObject, ErrorObjectConstructor } from "./types";

describe.only("ErrorObject behavior", () => {
  it("should be able to create an error object", () => {
    @Register
    class TestError extends errorObjectClassFactory(
      "Core::ValueObject::Error::TestError",
      z.object({
        foo: z.string(),
        doo: z.number(),
      })
    ) {}

    expectType<ValueObjectConstructor>(TestError);
    expectType<ErrorObjectConstructor>(TestError);

    const error = new TestError({ foo: "bar", doo: 1 });

    expectType<ValueObject>(error);
    expectType<ErrorObject>(error);
    expectType<Error>(error);
    expectType<string>(error.foo);
    expectType<number>(error.doo);
    expectType<TestError["FQN"]>(error.FQN);

    expect(error).toBeInstanceOf(Error);
    expect(isValueObject(error)).toBe(true);
    expect(error.FQN).toEqual("Core::ValueObject::Error::TestError");
    expect(error.foo).toEqual("bar");
    expect(error.doo).toEqual(1);
  });
});