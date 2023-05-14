import { ObjectType } from "myzod";
import { valueObjectClassFactory } from "../value-object";
import { ErrorObjectFQN } from "./types";
import { Compute, Constructor } from "../utils";

export function errorObjectClassFactory<
  Name extends ErrorObjectFQN,
  Validator extends ObjectType<any>,
>(name: Name, contextSchema: Validator) {
  const ctor = valueObjectClassFactory(name, contextSchema);

  return ctor as Compute<
    typeof ctor &
    Constructor<{ readonly name: "ErrorObject", readonly message: Name }>
  >;
}
