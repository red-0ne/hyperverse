import { Compute } from "../utils";
import { ValueObject, ValueObjectConstructor, ValueObjectFQN } from "../value-object/types";

export type ErrorObjectFQN<
  Domain extends string = string,
  Implementation extends string = string
> = ValueObjectFQN<Domain, `Error::${Implementation}`>;

export type ErrorObjectConstructor<
  Name extends ErrorObjectFQN = ErrorObjectFQN,
  Context extends { [key: string]: any } = { [key: string]: any },
> = Compute<{
  new(context: Context): ErrorObject<Name, Context>,
} & Pick<
  ValueObjectConstructor<Name, Context>,
  "FQN" | "schema" | "validator"
>>;

export type ErrorObject<
  Name extends ErrorObjectFQN = ErrorObjectFQN,
  Context extends { [key: string]: any } = { [key: string]: any }
> = ValueObject<Name, Context>;