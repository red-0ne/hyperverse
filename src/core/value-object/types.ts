import { MappedType, ObjectType, Type } from "myzod";
import { CoreNamingService } from "../runner/naming-service";
import { Compute } from "../utils";

export type FQN<
  Domain extends string = string,
  Abstraction extends string = string,
  Implementation extends string = string,
> = `${Domain}::${Abstraction}::${Implementation}`;

export type ValueObjectFQN<
  Domain extends string = any,
  Implementation extends string = any,
> = `${Domain}::ValueObject::${Implementation}`;

export type ValueObject<
  Name extends ValueObjectFQN = ValueObjectFQN,
  ValidatedValue extends { [key: string]: any } = { [key: string]: any },
> = Compute<{
  readonly FQN: Name,
  toJSON(): { [key in CoreNamingService["fqnKey"]]: Name } & { value: ValidatedValue },
  validator(): ObjectType<any>,
  properties(): [(keyof ValidatedValue)],
} & Readonly<{ [Key in keyof ValidatedValue]: ValidatedValue[Key] }>>;

export type ValueObjectConstructor<
  N extends ValueObjectFQN = ValueObjectFQN,
  X extends Record<string, any> = Record<string, any>,
> = {
  readonly FQN: N;
  validator(): ObjectType<X>;
  schema(): MappedType<ValueObject<N, X>>;
  new(input: X): ValueObject<N, X>;
}