import { ValueObjectConstructor, ValueObjectFQN } from "../value-object/types";

export type ErrorContext = { [key: string]: any };

export type ErrorObjectConstructor<
  Name extends ErrorObjectFQN = ErrorObjectFQN,
  Context extends ErrorContext = any,
> = ValueObjectConstructor<Name, Context>;

export type ErrorObject<
  Name extends ErrorObjectFQN = ErrorObjectFQN,
  Context extends ErrorContext = ErrorContext,
> = InstanceType<ErrorObjectConstructor<Name, Context>> ;

export type ErrorObjectFQN<
  Domain extends string = string,
  Implementation extends string = string
> = ValueObjectFQN<Domain, `Error::${Implementation}`>;
