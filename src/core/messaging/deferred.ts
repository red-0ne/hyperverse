import { ErrorObject, ErrorObjectConstructor } from "../errors";
import { ValueObject, ValueObjectConstructor } from "../value-object";

export abstract class DeferredReply<
  Success extends ValueObjectConstructor = ValueObjectConstructor,
  Failures extends [...ErrorObjectConstructor<any, any>[]] = [...ErrorObjectConstructor<any, any>[]],
> extends Promise<InstanceType<Success | Failures[number]>> {
  static readonly success: ValueObject;
  static readonly failures: [...ErrorObject[]];
  abstract readonly success: Success;
  abstract readonly failures: Failures;
}