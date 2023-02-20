import z from "myzod";

import { ServiceConstructor } from "../runner/service";
import { CoreNamingService, valueObjectClassFactory } from "../value-object";
import { ValueObjectFQN } from "../value-object/types";
import { messageSchema } from "./message";

export const dataMessageFQN: ValueObjectFQN<"Core", "Message::Data::"> = "Core::ValueObject::Message::Data::";

export function dataMessageClassFactory<Ctor extends ServiceConstructor, Command extends keyof InstanceType<Ctor>>(
  serviceCtor: Ctor,
  commandName: Command & string,
) {
  const serviceConfig = CoreNamingService.getCommandConfig(serviceCtor.FQN, commandName);
  if (!serviceConfig) {
    throw new Error(`Service ${serviceCtor.FQN} does not have a command named ${commandName}`);
  }

  const possibleReturns = serviceConfig.returnFQNs;

  return valueObjectClassFactory(
    `${dataMessageFQN}${serviceCtor.FQN}::${commandName}`,
    messageSchema.and(
      z.object({
        payload: z.union(possibleReturns.map(r => CoreNamingService.getValueObjectConstructor(r).schema())),
      }),
    ),
  );
}

export type DataMessageConstructor<Ctor extends ServiceConstructor, Command extends keyof InstanceType<Ctor>> = ReturnType<
  typeof dataMessageClassFactory<Ctor, Command>
>;

export type DataMessage<
  Ctor extends ServiceConstructor = ServiceConstructor,
  Command extends keyof InstanceType<Ctor> = keyof InstanceType<Ctor>,
> = InstanceType<DataMessageConstructor<Ctor, Command>>;

export type DataMessageFQN<
  Ctor extends ServiceConstructor = ServiceConstructor,
  Command extends keyof InstanceType<Ctor> = keyof InstanceType<Ctor>,
> = DataMessage<Ctor, Command>["FQN"];
