import { Infer } from "myzod";
import { Compute } from "../utils";
import { ValueObject, ValueObjectConstructor, ValueObjectFQN } from "../value-object/types";
import { DomainEventStreamService } from "./domain-event-stream";
import { baseDomainEventSchema } from "./domain-event";

type PayloadObject = { [key: string]: any };

export type DomainEventShape<Payload extends PayloadObject = PayloadObject> = Compute<
  Infer<typeof baseDomainEventSchema> &
  { payload: Payload }
>;

export type DomainEventConstructor<
  Name extends DomainEventFQN = DomainEventFQN,
  Shape extends DomainEventShape = any,
> = Compute<{
  from<P extends Shape["payload"], DEP extends DomainEventPayload<Name, P>>(p: P): DEP;
} & ValueObjectConstructor<Name, Shape>>;

export type DomainEvent<
  Name extends DomainEventFQN = DomainEventFQN,
  Shape extends DomainEventShape = DomainEventShape,
> = InstanceType<DomainEventConstructor<Name, Shape>>;

export type DomainEventFQN<
  Domain extends string = string,
  Implementation extends string = string
> = ValueObjectFQN<Domain, `DomainEvent::${Implementation}`>;

export type DomainEventPayloadConstructor<
  Name extends DomainEventFQN = DomainEventFQN,
  Payload extends PayloadObject = PayloadObject,
> = ValueObjectConstructor<DomainEventPayloadFQN<Name>, Payload>;

// we extract DomainEventPayloadFQN from DomainEventFQN
export type DomainEventPayload<
  Name extends DomainEventFQN = DomainEventFQN,
  Payload extends PayloadObject = PayloadObject,
> = ValueObject<DomainEventPayloadFQN<Name>, Payload>;

export type DomainEventPayloadFQN<Name extends string> = Name extends DomainEventFQN<
  infer Domain,
  infer Implementation
>
  ? ValueObjectFQN<Domain, `${Implementation}::Payload`>
  : never;

export type ServiceEventPayload<
  T extends DomainEventStreamService
> = ReturnType<T["ids"][number]["from"]>;
