import { Infer, ObjectType } from "myzod";
import { valueObjectClassFactory } from "../value-object";
import { ErrorObjectConstructor, ErrorObjectFQN } from "./types";

export function errorObjectClassFactory<
  Name extends ErrorObjectFQN,
  Validator extends ObjectType<any>,
>(name: Name, contextSchema: Validator): ErrorObjectConstructor<Name, Infer<Validator>> {
  return valueObjectClassFactory(name, contextSchema) as any;
}
