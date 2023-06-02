import { isDeferredReplyConstructor } from "../messaging/deferred";
import { isValueObject } from "../value-object/value-object-factory";
import { CoreNamingService } from "./naming-service";

export function Exposable(target: any, key: string) {
  const params = Reflect.getMetadata("design:paramtypes", target, key);
  const returnType = Reflect.getMetadata("design:returntype", target, key);

  // TODO emit logs instead of just ignoring the command

  if (params?.length > 1) {
    return;
  }

  if (params?.length === 1 && !isValueObject(params?.[0]?.prototype)) {
    return;
  }

  if (
    !isDeferredReplyConstructor(returnType) ||
    !isValueObject(returnType.success?.prototype) ||
    !Array.isArray(returnType.failures) ||
    !returnType.failures.every((e: any) =>
      isValueObject(e.prototype) && e.prototype instanceof Error)
  ) {
    return;
  }

  if (!target.constructor.FQN || !target.constructor.token) {
    return;
  }

  CoreNamingService.registerCommand(
    target.constructor,
    key,
    params[0],
    returnType,
  );
  return target;
}
