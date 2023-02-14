import "reflect-metadata";

import { LogParamTypes } from "./exposable"

function dec(target: any, key: string) {
  console.log("decorator");
}

it('should log param types', (done) => {
function collectMetadata<T extends { new (...args: any[]): {} }>(constructor: T) {
  const metadata: { [methodName: string]: { params: any[], return: any } } = {};

  Object.getOwnPropertyNames(constructor.prototype).forEach(methodName => {
    if (methodName !== 'constructor') {
      const descriptor = Object.getOwnPropertyDescriptor(constructor.prototype, methodName);
      // @ts-ignore
      if (typeof descriptor.value === 'function') {
        const paramTypes = Reflect.getMetadata('design:paramtypes', constructor.prototype, methodName);
        const returnType = Reflect.getMetadata('design:returntype', constructor.prototype, methodName);

        metadata[methodName] = {
          params: paramTypes,
          return: returnType
        };
      }
    }
  });

  // @ts-ignore
  constructor.metadata = metadata;

  return constructor;
}

@collectMetadata
class MyClass {
  myMethod(arg1: string, arg2: number): boolean {
    return true;
  }
}
// @ts-ignore
console.log(MyClass.metadata);
setTimeout(done, 100);
});