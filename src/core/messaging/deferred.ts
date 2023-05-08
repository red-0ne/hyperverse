import { ErrorObject, ErrorObjectConstructor, ErrorObjectFQN } from "../errors";
import { ErrorContext } from "../errors/types";
import { Compute } from "../utils";
import { ValueObjectConstructor } from "../value-object";
import { ValueObject, ValueObjectFQN } from "../value-object/types";

export function deferredReplyClassFactory<
  Domain extends string,
  Implementation extends string,
  SuccessName extends ValueObjectFQN,
  ErrorName extends ErrorObjectFQN,
  Value extends { [key: string]: any },
  Ctors extends Readonly<ErrorObjectConstructor<ErrorObjectFQN, any>[]>,
>(
  name: ValueObjectFQN<Domain, `Reply::${Implementation}`>,
  success: ValueObjectConstructor<SuccessName, Value>,
  failures: Ctors,
) {
  return class extends Promise<ValueObject<SuccessName, Value> | ValueObject<ErrorName, any>> {
    static readonly success = success;
    static readonly failures = failures;
    static readonly FQN = name;
    readonly FQN = name;
  }
}

export type DeferredReply<
  Domain extends string = string,
  Implementation extends string = string,
  SuccessName extends ValueObjectFQN = any,
  ErrorName extends ErrorObjectFQN = any,
  Value extends { [key: string]: any } = any,
  Failure extends ErrorContext = any,
> = Compute<
  Promise<ValueObject<SuccessName, Value> | ErrorObject<ErrorName, Failure>> &
  { FQN: ValueObjectFQN<Domain, `Reply::${Implementation}`> }
>;

export type DeferredReplyConstructor<
  Domain extends string = string,
  Implementation extends string = string,
  SuccessName extends ValueObjectFQN = any,
  ErrorName extends ErrorObjectFQN = any,
  Value extends { [key: string]: any } = any,
  Failure extends { context: { [key: string]: any } } = any,
> = {
  success: ValueObjectConstructor<SuccessName, Value>;
  failures: ErrorObjectConstructor<ErrorName, Failure>[];
  FQN: ValueObjectFQN<Domain, `Reply::${Implementation}`>,
};
