import "reflect-metadata";

import { BaseMicroService } from "./base";

export function Channel(target: BaseMicroService, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) {
  const serviceMetadata = Reflect.getMetadata("serviceMetadata", target.constructor) || [];

  serviceMetadata.push(propertyKey);

  Reflect.defineMetadata("serviceMetadata", serviceMetadata, target.constructor);

  const validators = Reflect.getMetadata("validators", target.constructor, propertyKey);

  if (!validators) {
    return;
  }

  const method = descriptor.value;

  descriptor.value = function(...args: any[]) {
    const length = Math.max(validators.length, args.length);
    let errorIndex = -1;

    for (let i = 0; i < length; i++) {
      if (!validators[i](args[i])) {
        errorIndex = i;
        break;
      }
    }

    if (errorIndex >= 0) {
      target.onInvalidParameter(propertyKey, errorIndex, args[errorIndex]);
    } else {
      return method.apply(this, args);
    }
  };
}

export function Validate(validator: (value: any) => boolean) {
  return (target: any, propertyKey: string, parameterIndex: number) => {
    let validators = Reflect.getMetadata("validators", target.constructor, propertyKey);

    if (!validators) {
      validators = [];
    }
    validators[parameterIndex] = validator;

    Reflect.defineMetadata("validators", validators, target.constructor, propertyKey);
  };
}
