import z, { Infer, ObjectType } from "myzod";
import { valueObjectClassFactory } from "../value-object";
import { ErrorFQN, ErrorObjectConstructor } from "./types";

export function errorObjectClassFactory<
  Name extends ErrorFQN,
  Validator extends ObjectType<any>,
>(
  name: Name,
  contextSchema: Validator,
): ErrorObjectConstructor<Name, Infer<Validator>> {

  return valueObjectClassFactory(name, contextSchema);
}