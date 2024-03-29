import z, { ObjectShape, AnyType, Infer, ObjectType, Type } from "myzod"
import { appVersionSchema, Compute, positiveIntegerSchema } from "../utils";
import { valueObjectClassFactory } from "../value-object"
import { ValueObjectFQN } from "../value-object/types";
import { DomainEventConstructor } from "./types";

export const baseDomainEventSchema = z.object({
  eventTypeSequence: positiveIntegerSchema,
  topicSequence: positiveIntegerSchema,
  timestamp: positiveIntegerSchema,//.map(v => new Date(v)),
  appVersion: appVersionSchema,
  payload: z.unknown(),
});

export function domainEventClassFactory<
  Domain extends string,
  Implementation extends string,
  Payload extends any,
>(
  name: ValueObjectFQN<Domain, `DomainEvent::${Implementation}`>,
  payloadSchema: Type<Payload>
) {
  const payloadFQN = `${name as ValueObjectFQN}::Payload` as const;
  const embeddedPayloadSchema = z.object({ payload: payloadSchema });
  const schema = baseDomainEventSchema.and(embeddedPayloadSchema);

  const PayloadVO = valueObjectClassFactory(payloadFQN, embeddedPayloadSchema);
  const cls = valueObjectClassFactory(name, schema);

  Object.defineProperty(cls, "from", {
    value: function(payload: Payload): InstanceType<typeof PayloadVO> {
      // @ts-ignore
      return new PayloadVO({ payload });
    }
  })

  return cls as Compute<typeof cls & { from(payload: Payload): InstanceType<typeof PayloadVO> }>;
}