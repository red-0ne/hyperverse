import z from "myzod";

import { ServiceConstructor } from "../runner/types";
import { CoreNamingService, valueObjectClassFactory } from "../value-object";
import { ValueObjectFQN } from "../value-object/types";
import { messageSchema } from "./message";

export const dataMessageFQN: ValueObjectFQN<"Core", "Message::Data::"> = "Core::ValueObject::Message::Data::";

export function dataMessageClassFactory<
  Ctor extends ServiceConstructor,
  Command extends keyof InstanceType<Ctor>,
>(serviceCtor: Ctor, commandName: Command & string) {
  const serviceConfig = CoreNamingService.getServiceConfig(serviceCtor.FQN);
  const success = serviceConfig?.commands?.[commandName]?.return.success;
  const failures = serviceConfig?.commands?.[commandName]?.return.failures;

  return valueObjectClassFactory(
    `${dataMessageFQN}${serviceCtor.FQN}::${commandName}`,
    messageSchema.and(z.object({
      payload: z.union([
        success.schema(),
        ...failures.map(f => f.schema()),
      ]),
    })),
  );
}

export type DataMessageConstructor<
  Ctor extends ServiceConstructor,
  Command extends keyof InstanceType<Ctor>,
> = ReturnType<typeof dataMessageClassFactory<Ctor, Command>>;

export type DataMessage<
  Ctor extends ServiceConstructor = ServiceConstructor,
  Command extends keyof InstanceType<Ctor> = keyof InstanceType<Ctor>,
> = InstanceType<DataMessageConstructor<Ctor, Command>>;

export type DataMessageFQN<
  Ctor extends ServiceConstructor = ServiceConstructor,
  Command extends keyof InstanceType<Ctor> = keyof InstanceType<Ctor>,
> = DataMessage<Ctor, Command>["FQN"];