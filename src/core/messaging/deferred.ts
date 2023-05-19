import { ErrorObjectConstructor } from "../errors";
import { ValueObjectConstructor } from "../value-object";

// We need this because we cannot get decorated return type param when
// wrapped in a Promise so each deferred reply class needs to be defined
export function deferredReplyClassFactory<
  Success extends ValueObjectConstructor,
  Failures extends Readonly<ErrorObjectConstructor[]>,
>(
  success: Success,
  failures: Failures,
) {
  return class extends Promise<InstanceType<Success> | InstanceType<Failures[number]>> {
    static readonly success = success;
    static readonly failures = failures;

    readonly success = success;
    readonly failures = failures;
  }
}

export type DeferredReplyConstructor<
  Success extends ValueObjectConstructor = ValueObjectConstructor,
  Failures extends Readonly<ErrorObjectConstructor[]> = Readonly<ErrorObjectConstructor[]>,
> = ReturnType<typeof deferredReplyClassFactory<Success, Failures>>;

export type DeferredReply<
  Success extends ValueObjectConstructor,
  Failures extends Readonly<ErrorObjectConstructor[]>,
> = InstanceType<DeferredReplyConstructor<Success, Failures>>;