import z, { ObjectType, Infer } from "myzod"
import { appVersionSchema, positiveIntegerSchema } from "../utils";
import { valueObjectClassFactory } from "../value-object"
import { DomainEventConstructor, DomainEventFQN, DomainEventPayloadFQN, DomainEventShape } from "./types";

export const baseDomainEventSchema = z.object({
  eventTypeSequence: positiveIntegerSchema,
  topicSequence: positiveIntegerSchema,
  timestamp: positiveIntegerSchema,
  appVersion: appVersionSchema,
  payload: z.unknown(),
});

export function domainEventClassFactory<
  Name extends DomainEventFQN,
  PayloadFQN extends DomainEventPayloadFQN<Name>,
  PayloadValidator extends ObjectType<any>,
  Payload extends Infer<PayloadValidator>,
>(
  name: Name,
  payloadSchema: PayloadValidator,
) {
  // TODO remove as?
  const payloadFQN = `${name}::Payload` as PayloadFQN;

  const schema = z.object({
    ...baseDomainEventSchema.shape(),
    payload: payloadSchema,
  });

  const PayloadVO = valueObjectClassFactory(payloadFQN, payloadSchema);
  const cls = valueObjectClassFactory(name, schema);

  Object.defineProperty(cls, "withPayload", {
    value: function(payload: Payload): InstanceType<typeof PayloadVO> {
      return new PayloadVO(payload);
    }
  });

  return cls as unknown as DomainEventConstructor<Name, DomainEventShape<Payload>>;
}
