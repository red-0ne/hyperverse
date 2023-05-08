import z, { Type } from "myzod";
import { CoreNamingService } from "../runner/naming-service";
import { ExposableServiceConstructor } from "../runner/service";
import { valueObjectClassFactory } from "../value-object";
import { ValueObject, ValueObjectFQN } from "../value-object/types";
import { isValueObject } from "../value-object/value-object-factory";
import { DeferredReply } from "./deferred";
import { messageSchema } from "./message";

export type Commands<Svc> = {
  [Command in keyof Svc]: Svc[Command] extends (arg: infer A) => DeferredReply ? A extends ValueObject ? Command : never : never;
}[keyof Svc] & string;

type CommandParam<
  Svc extends InstanceType<ExposableServiceConstructor>,
  Command extends Commands<Svc>
> = Svc[Command] extends (arg: infer Args extends ValueObject) => DeferredReply
  ? Args
  : never;

export const commandMessageFQN: ValueObjectFQN<"Core", "Message::Command::"> = `Core::ValueObject::Message::Command::`;

export function commandMessageClassFactory<
  Ctor extends ExposableServiceConstructor,
  Svc extends InstanceType<Ctor> = InstanceType<Ctor>,
  Command extends Commands<Svc>  = Commands<Svc>,
  Param extends CommandParam<Svc, Command> = CommandParam<Svc, Command>
>(serviceCtor: Ctor, commandName: Command) {
  const commandConfig = CoreNamingService.getCommandConfig(serviceCtor.FQN, commandName);
  if (!commandConfig?.paramFQN) {
    throw new Error(`Service ${serviceCtor.FQN} does not have a command named ${commandName}`);
  }

  const paramFQN: Param["FQN"] = commandConfig.paramFQN;
  const ParamVO = CoreNamingService.getValueObjectConstructor(paramFQN);
  if (!isValueObject(ParamVO)) {
    throw new Error(`Command config ${commandConfig.paramFQN} unavailable`);
  }

  const cmdCtor = valueObjectClassFactory(
    `${commandMessageFQN}${serviceCtor.FQN}::${commandName}`,
    z.object({
      ...messageSchema.shape(),
      payload: z.object({
        serviceFQN: z.literal(serviceCtor.FQN as Svc["FQN"]),
        command: z.literal(commandName),
        param: ParamVO.schema(),
      }),
    }),
  );

  return cmdCtor;
}

export type CommandMessageConstructor<
  Ctor extends ExposableServiceConstructor,
  Command extends Commands<InstanceType<Ctor>>,
> = ReturnType<typeof commandMessageClassFactory<Ctor, Command>>;

export type CommandMessage<
  Ctor extends ExposableServiceConstructor = ExposableServiceConstructor,
  Command extends Commands<InstanceType<Ctor>> = Commands<InstanceType<Ctor>>,
> = InstanceType<CommandMessageConstructor<Ctor, Command>>;

export type CommandMessageFQN<
  Ctor extends ExposableServiceConstructor = ExposableServiceConstructor,
  Command extends Commands<InstanceType<Ctor>> = Commands<InstanceType<Ctor>>,
> = CommandMessage<Ctor, Command>["FQN"];
