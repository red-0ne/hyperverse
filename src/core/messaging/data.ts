import z from "myzod";
import { CoreNamingService } from "../runner/naming-service";
import { ExposableServiceConstructor } from "../runner/service";
import { valueObjectClassFactory } from "../value-object";
import { ValueObjectFQN } from "../value-object/types";
import { messageSchema } from "./message";

export const dataMessageFQN: ValueObjectFQN<"Core", "Message::Data::"> = "Core::ValueObject::Message::Data::";

export function dataMessageClassFactory<
  Ctor extends ExposableServiceConstructor,
  Command extends keyof InstanceType<Ctor>,
>(serviceCtor: Ctor, commandName: Command & string) {
  const serviceConfig = CoreNamingService.getCommandConfig(serviceCtor.FQN, commandName);
  if (!serviceConfig) {
    throw new Error(`Service ${serviceCtor.FQN} does not have a command named ${commandName}`);
  }

  const [successFQN, ...failureFQNs] = serviceConfig.returnFQNs;
  const success = CoreNamingService.getValueObjectConstructor(successFQN);
  const failures = failureFQNs.map(f => CoreNamingService.getValueObjectConstructor(f));

  const dataCtor = valueObjectClassFactory(
    `${dataMessageFQN}${serviceCtor.FQN}::${commandName}`,
    z.object({
      ...messageSchema.shape(),
      payload: z.union([success, ...failures].map(r => r.schema())),
    }),
  );

  return dataCtor;
}

export type DataMessageConstructor<
  Ctor extends ExposableServiceConstructor,
  Command extends keyof InstanceType<Ctor>,
> = ReturnType<typeof dataMessageClassFactory<Ctor, Command>>;

export type DataMessage<
  Ctor extends ExposableServiceConstructor = ExposableServiceConstructor,
  Command extends keyof InstanceType<Ctor> = keyof InstanceType<Ctor>,
> = InstanceType<DataMessageConstructor<Ctor, Command>>;

export type DataMessageFQN<
  Ctor extends ExposableServiceConstructor = ExposableServiceConstructor,
  Command extends keyof InstanceType<Ctor> = keyof InstanceType<Ctor>,
> = DataMessage<Ctor, Command>["FQN"];
