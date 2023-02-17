import z, { Infer, ObjectType } from "myzod";
import { ValueObject, ValueObjectConstructor, ValueObjectFQN } from "./types";
import { CoreNamingService } from "../runner/naming-service";

const root = z.unknown();

// we use this to create a root constructor for value objects so we can use instanceof
// eslint-disable-next-line @typescript-eslint/no-empty-function
function valueObjectRootConstructor() {}

export function isValueObject(value: any): value is ValueObject {
  return value instanceof valueObjectRootConstructor;
}

export function valueObjectClassFactory<
  Name extends ValueObjectFQN,
  Validator extends ObjectType<any>,
>(name: Name, validator: Validator): ValueObjectConstructor<Name, Infer<Validator>> {
  const ValueObjectConstructor = function(
    this: { __parsedValue__: Infer<Validator> },
    input: Infer<Validator>
  ) {
    const extractedInput = ( input?.value && input?.[CoreNamingService.fqnKey] === name)
      ? input.value
      : input;

    this.__parsedValue__ = validator.parse(extractedInput) as Infer<Validator>;
  } as unknown as ValueObjectConstructor<Name, Infer<Validator>>;

  Object.defineProperties(ValueObjectConstructor, {
    validator: { value: function() { return validator; } },
    schema: { value: function() { return root.map((v) => new ValueObjectConstructor(v as any)); } },
    FQN: { get() { return name; } },
  });

  ValueObjectConstructor.prototype = Object.create(
    buildPrototype(name, validator),
    { constructor: { value: ValueObjectConstructor } },
  );

  // @ts-expect-error we suppress type too complex error
  CoreNamingService.registerValueObject(ValueObjectConstructor);

  return ValueObjectConstructor;
}

function buildPrototype<
  Name extends ValueObjectFQN,
  Value extends { [key: string]: any },
  Validator extends ObjectType<Value>,
>(name: Name, validator: Validator) {
  const properties = Object.keys(validator.shape());

  const proto = Object.create(valueObjectRootConstructor.prototype, {
    properties: { value: function() { return properties }, enumerable: true },
    validator: { value: function() { validator }, enumerable: true },
    FQN: {
      get() { return name; },
      enumerable: true,
    },
    toJSON: {
      value: function(this: { __parsedValue__: Value }) {
        return {
          [CoreNamingService.fqnKey]: name,
          value: this.__parsedValue__,
        }
      },
      enumerable: true,
    },
    value: {
      value: function(this: { __parsedValue__: Value }) {
        // use structuredClone ?
        return this.__parsedValue__;
      },
      enumerable: true,
    },
  });

  for (const key of properties) {
    Object.defineProperty(proto, key, {
      get(this: { __parsedValue__: Value }) { return this.__parsedValue__[key]; },
      enumerable: true,
    });
  }

  Object.freeze(proto);

  return proto;
}