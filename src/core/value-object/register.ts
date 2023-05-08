import { CoreNamingService } from "../runner/naming-service";
import { isValueObject } from "./value-object-factory";

export function Register(target: any) {
  if (isValueObject(target.prototype)) {
    CoreNamingService.registerValueObject(target);
  }
}