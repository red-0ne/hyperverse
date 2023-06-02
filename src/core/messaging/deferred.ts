import { ErrorObjectConstructor } from "../errors";
import { CommandErrors } from "../runner";
import { Compute, Constructor } from "../utils";
import { ValueObjectConstructor } from "../value-object";

type ValidReturns<
  Success extends ValueObjectConstructor,
  Failures extends Readonly<ErrorObjectConstructor[]>,
> = InstanceType<Success | Failures[number] | typeof CommandErrors[number]>

// We need this because we cannot get decorated return type param when
// wrapped in a Promise so each deferred reply class needs to be defined
export function deferredReplyClassFactory<
  Success extends ValueObjectConstructor,
  Failures extends Readonly<ErrorObjectConstructor[]>,
>(
  success: Success,
  failures: Failures,
) {
  const allErrors = [...failures, ...CommandErrors] as const;
  const possibleReturns = [success, ...allErrors] as const;
  const isValid = (value: unknown): boolean => {
    for (const c of possibleReturns) {
      if (value instanceof c) {
        return true;
      }
    }

    return false;
  };

  function DeferredReplyCtor(result: () => Promise<ValidReturns<Success, Failures>>) {
    return new Promise<ValidReturns<Success, Failures>>((resolve, reject) => {
      result().then(resolve).catch(reject);
    }) as Promise<ValidReturns<Success, Failures>> & { isValid(value: unknown): boolean };
  }

  DeferredReplyCtor.success = success;
  DeferredReplyCtor.failures = allErrors;
  DeferredReplyCtor.isValid = isValid;

  return DeferredReplyCtor as unknown as DeferredReplyConstructor<Success, Failures>;
}

export type DeferredReplyConstructor<
  Success extends ValueObjectConstructor = ValueObjectConstructor,
  Failures extends Readonly<ErrorObjectConstructor[]> = Readonly<ErrorObjectConstructor[]>,
> = Compute<
  Constructor<
    Promise<ValidReturns<Success, Failures>> & { isValid(value: unknown): boolean },
    [() => Promise<ValidReturns<Success, Failures>>]
  > &
  { success: Success; failures: Failures; isValid(value: unknown): boolean }
>;

export type DeferredReply<
  Success extends ValueObjectConstructor,
  Failures extends Readonly<ErrorObjectConstructor[]>,
> = InstanceType<DeferredReplyConstructor<Success, Failures>>;