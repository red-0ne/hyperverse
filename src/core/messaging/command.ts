import z  from "myzod";
import { ServiceConstructor } from "../runner/service";
import { CoreNamingService, valueObjectClassFactory } from "../value-object";
import { ValueObjectFQN } from "../value-object/types";
import { messageSchema } from "./message";

export const commandMessageFQN: ValueObjectFQN<"Core", "Message::Command::"> = `Core::ValueObject::Message::Command::`;

export function commandMessageClassFactory<
  Ctor extends ServiceConstructor,
  Command extends keyof InstanceType<Ctor>,
>(serviceCtor: Ctor, commandName: Command & string) {
  const commandConfig = CoreNamingService.getCommandConfig(serviceCtor.FQN, commandName);

  if (!commandConfig?.paramFQN) {
    throw new Error(`Service ${serviceCtor.FQN} does not have a command named ${commandName}`);
  }

  return valueObjectClassFactory(
    `${commandMessageFQN}${serviceCtor.FQN}::${commandName}`,
    messageSchema.and(z.object({
      payload: z.object({
        serviceFQN: z.literal(serviceCtor.FQN),
        command: z.literal(commandName),
        param: CoreNamingService.getValueObjectConstructor(commandConfig.paramFQN).schema(),
      }),
    })),
  );
}

export type CommandMessageConstructor<
  Ctor extends ServiceConstructor,
  Command extends keyof InstanceType<Ctor>,
> = ReturnType<typeof commandMessageClassFactory<Ctor, Command>>;

export type CommandMessage<
  Ctor extends ServiceConstructor = ServiceConstructor,
  Command extends keyof InstanceType<Ctor> = keyof InstanceType<Ctor>,
> = InstanceType<CommandMessageConstructor<Ctor, Command>>;

export type CommandMessageFQN<
  Ctor extends ServiceConstructor = ServiceConstructor,
  Command extends keyof InstanceType<Ctor> = keyof InstanceType<Ctor>,
> = CommandMessage<Ctor, Command>["FQN"];