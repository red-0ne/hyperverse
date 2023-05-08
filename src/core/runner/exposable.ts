import { isValueObject } from "../value-object/value-object-factory";
import { CoreNamingService } from "./naming-service";

export function Exposable(target: any, key: string) {
  const params = Reflect.getMetadata("design:paramtypes", target, key);
  const returnType = Reflect.getMetadata("design:returntype", target, key);

  // maybe we should emit alerts or logs instead of just ignoring the command

  if (params?.length > 1) {
    return;
  }

  if (params?.length === 1 && !isValueObject(params?.[0]?.prototype)) {
    return;
  }

  if (isValueObject(!returnType?.prototype)) {
    return;
  }

  if (!target.constructor.FQN || !target.constructor.token) {
    return;
  }

  CoreNamingService.registerCommand(target.constructor, key, params?.[0]?.prototype, returnType);
}
