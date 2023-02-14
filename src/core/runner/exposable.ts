import "reflect-metadata"
import z from "myzod";
import { DeferredReply } from "../messaging";
import { CoreNamingService, ValueObject, valueObjectClassFactory } from "../value-object";
import { CommandNotFound } from "./errors";
import { isValueObject } from "../value-object/value-object-factory";

function Exposable(target: any, key: string) {
  const params = Reflect.getMetadata('design:paramtypes', target, key);
  const returnType = Reflect.getMetadata('design:returntype', target, key);
  if (!params || params.length > 1 || !returnType) {
    return;
  }

  const isDef = returnType.prototype instanceof DeferredReply;
  const param = typeof params?.[0]?.FQN === "string" ? params[0] : undefined;
  const reply = returnType?.success?.FQN ? returnType : undefined;

  if (!isValueObject(param.prototype) || !isValueObject(reply.success.prototype)) {
    return;
  }

  //CoreNamingService.registerCommand(target.constructor.FQN, key, param, reply);
}

class YAY extends valueObjectClassFactory("Test::ValueObject::YAY", z.object({ yay: z.string() })) {}
class YOY extends valueObjectClassFactory("Test::ValueObject::YOY", z.object({ yoy: z.number() })) {}

// @ts-ignore
class DeferredZoo extends DeferredReply {
}

// @ts-ignore
class DeferredBar extends DeferredZoo {
}

// @ts-ignore
class DeferredFoo extends DeferredBar {
  static readonly success = YAY;
  static readonly failures = [CommandNotFound];
}


class Foo {
  @Exposable
  bar(foo: YOY): DeferredFoo {
    // @ts-ignore
    return new DeferredFoo(resolve => resolve(foo));
  }
}