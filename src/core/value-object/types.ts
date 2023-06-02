import { MappedType, ObjectType, Type } from "myzod";
import { CoreNamingService } from "../runner";
import { Compute } from "../utils";

/** Fully Qualified Name */
export type FQN<
  Domain extends string = string,
  Abstraction extends string = string,
  Implementation extends string = string,
> = `${Domain}::${Abstraction}::${Implementation}`;

export type ValueObjectFQN<Domain extends string = string, Implementation extends string = string> = `${Domain}::ValueObject::${Implementation}`;

export type ValueObject<
  Name extends ValueObjectFQN = ValueObjectFQN,
  ValidatedValue = any,
> = Compute<{
  readonly FQN: Name,
  toJSON(): Compute<{ [key in CoreNamingService["fqnKey"]]: Name } & { value: ValidatedValue }>,
  validator(): ObjectType<any>,
  properties(): (keyof ValidatedValue)[],
  value(): ValidatedValue,
} & Readonly<{ [Key in keyof ValidatedValue]: ValidatedValue[Key] }>>;

export type ValueObjectConstructor<
  N extends ValueObjectFQN = ValueObjectFQN,
  X extends Record<string, any> = any,
  VO extends ValueObject<N, X> = ValueObject<N, X>
> = {
  readonly FQN: N;
  validator<T extends ObjectType<X>>(): T;
  schema<MT extends MappedType<VO>>(): MT;
  new(input: X): ValueObject<N, X>;
}
