import { Compute } from "../utils";
import { ValueObject, ValueObjectConstructor, ValueObjectFQN } from "../value-object/types";
import { DomainEventStreamService } from "./domain-event-stream";

export type DomainEventConstructor<
  Name extends ValueObjectFQN<string, `DomainEvent::${string}`> = any,
  Payload = any,
> = Compute<{
  from(p: Payload): ValueObject<
    ValueObjectFQN<string, `DomainEvent::${string}::Payload`>,
    { payload: Payload }
  >;
} & ValueObjectConstructor<Name, any>>;

export type EventPayload<
  T extends DomainEventStreamService
> = ReturnType<T["ids"][number]["from"]>;