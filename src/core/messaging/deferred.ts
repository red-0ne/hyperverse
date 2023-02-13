import { ErrorObjectConstructor } from "../errors";
import { ValueObjectConstructor } from "../value-object";

export abstract class DeferredReply<
  Success extends ValueObjectConstructor = ValueObjectConstructor,
  Failures extends ErrorObjectConstructor[] = ErrorObjectConstructor[],
> extends Promise<InstanceType<Success | Failures[number]>> {
  abstract readonly success: Success;
  abstract readonly failures: Failures;
}