import z, { Infer, ObjectType } from "myzod";
import { ValueObject, ValueObjectConstructor, ValueObjectFQN } from "./types";
import { CoreNamingService } from "../runner/naming-service";
import { ErrorObjectFQN } from "../errors";

const root = z.unknown();

// We have to split out error VO from regular VO so that we can have
// a different prototype chain for them (Error.prototype) vs (ValueObject.prototype)
// so that we can use instanceof to check for errors vs values when messages are received
// Having errors inherit from Error is important for stack traces and other error handling features of JS
// eslint-disable-next-line @typescript-eslint/no-empty-function

const ValueObject = {};

// eslint-disable-next-line @typescript-eslint/no-empty-function
function valueObjectRootConstructor() {}
valueObjectRootConstructor.prototype = Object.create(ValueObject, {});
Reflect.setPrototypeOf(valueObjectRootConstructor, ValueObject);

function errorObjectRootConstructor(this: Error, code: ErrorObjectFQN) {
  const instance = Reflect.construct(Error, [code]);
  this.name = "ErrorObject";
  Reflect.setPrototypeOf(instance, Reflect.getPrototypeOf(this));
  return instance;
}
errorObjectRootConstructor.prototype = Object.create(Error.prototype, {
  constructor: {
    value: Error,
    enumerable: false,
    writable: true,
    configurable: true,
  },
});
Reflect.setPrototypeOf(errorObjectRootConstructor, Error);

export function isValueObject(value: any): value is ValueObject {
  return value instanceof valueObjectRootConstructor || value instanceof errorObjectRootConstructor;
}

export function valueObjectClassFactory<
  Name extends ValueObjectFQN,
  Validator extends ObjectType<any>,
>(name: Name, validator: Validator): ValueObjectConstructor<Name, Infer<Validator>> {
  const ValueObjectConstructor = function(
    this: { __parsedValue__: Infer<Validator> },
    input: Infer<Validator>
  ) {
    let extractedInput = ( input?.value && input?.[CoreNamingService.fqnKey] === name)
      ? input.value
      : input;

    if (isValueObject(extractedInput)) {
      extractedInput = extractedInput.value();
    }

    this.__parsedValue__ = validator.parse(extractedInput) as Infer<Validator>;
  } as unknown as ValueObjectConstructor<Name, Infer<Validator>>;

  Object.defineProperties(ValueObjectConstructor, {
    validator: { value: function() { return validator; } },
    FQN: { get() { return name; } },
    schema: { value: function() {
      return root.map(v => {
        const ctor = CoreNamingService.getValueObjectConstructor(name);
        return new ctor(v as any);
      });
    } },
  });

  ValueObjectConstructor.prototype = Object.create(buildPrototype(name, validator), { constructor: { value: ValueObjectConstructor } });

  return ValueObjectConstructor;
}

function buildPrototype<Name extends ValueObjectFQN, Value extends { [key: string]: any }, Validator extends ObjectType<Value>>(
  name: Name,
  validator: Validator,
) {
  const properties = Object.keys(validator.shape());

  const cmp = name.split("::");
  const currentProto = cmp?.[1] === "ValueObject" && cmp?.[2] === "Error"
    ? errorObjectRootConstructor.prototype
    : valueObjectRootConstructor.prototype;
  const proto = Object.create(currentProto, {
    properties: { value: function() { return properties; } },
    validator: { value: function() { return validator; } },
    FQN: { value: name, enumerable: false },
    toJSON: {
      value: function (this: { __parsedValue__: Value }) {
        return {
          [CoreNamingService.fqnKey]: name,
          value: this.__parsedValue__,
        };
      },
    },
    value: {
      value: function (this: { __parsedValue__: Value }) {
        // use structuredClone ?
        return this.__parsedValue__;
      },
    },
  });

  for (const key of properties) {
    Object.defineProperty(proto, key, {
      get(this: { __parsedValue__: Value }) {
        return this.__parsedValue__[key];
      },
      enumerable: true,
    });
  }

  Object.freeze(proto);

  return proto;
}
