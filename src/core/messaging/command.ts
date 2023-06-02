import z, { Infer, MappedType } from "myzod";
import { CoreNamingService, ExposableServiceConstructor } from "../runner";
import { FQN, ValueObject, ValueObjectConstructor, ValueObjectFQN, valueObjectClassFactory } from "../value-object";
import { Compute } from "../utils";
import { ErrorObjectConstructor } from "../errors";
import { DeferredReply } from "./deferred";
import { singleMessageSchema } from "./message";

export type Commands<Svc> = {
  [Command in keyof Svc]: Svc[Command] extends
    (arg: infer _ extends ValueObject) => DeferredReply<
      ValueObjectConstructor,
      Readonly<ErrorObjectConstructor[]>
    >
    ? Command extends "FQN"
      ? never
      : Command
    : never;
}[keyof Svc] & string;

type CommandParam<
  Svc extends InstanceType<ExposableServiceConstructor>,
  Command extends Commands<Svc>
> = Svc[Command] extends (arg: infer Args) => DeferredReply<ValueObjectConstructor, Readonly<ErrorObjectConstructor[]>>
  ? Args extends ValueObject
    ? Args
    : never
  : never;

export type CommandMessageFQN<Implementation extends string = string> = ValueObjectFQN<"Core", `Message::Command::${Implementation}`>;
export const commandMessageFQN = `Core::ValueObject::Message::Command::`;

export function commandMessageClassFactory<
  Ctor extends ExposableServiceConstructor,
  Svc extends InstanceType<Ctor> = InstanceType<Ctor>,
  Command extends Commands<Svc> = Commands<Svc>,
  Param extends CommandParam<Svc, Command> = CommandParam<Svc, Command>
>(serviceCtor: Ctor, commandName: Command) {
  const commandConfig = CoreNamingService.getCommandConfig(serviceCtor.FQN, commandName);
  if (!commandConfig) {
    throw new Error(`Service ${serviceCtor.FQN} does not have a command named ${commandName}`);
  }

  const paramFQN = commandConfig.paramFQN;
  const svcFQN: Svc["FQN"] = serviceCtor.FQN;
  const ParamVO  = CoreNamingService.getValueObjectConstructor(paramFQN);
  const fqn: CommandMessageFQN<`${Svc["FQN"]}::${Command}`> = `${commandMessageFQN}${svcFQN}::${commandName}`;
  const validator = z.object({
    ...singleMessageSchema.shape(),
    payload: z.object({
      serviceFQN: z.literal(serviceCtor.FQN as Svc["FQN"]),
      command: z.literal(commandName),
      param: ParamVO.schema() as MappedType<Param>,
    }),
  });

  const cmdCtor = valueObjectClassFactory(fqn, validator);

  return cmdCtor;
}

export type CommandMessageConstructor<
  Ctor extends ExposableServiceConstructor = ExposableServiceConstructor,
  Command extends Commands<InstanceType<Ctor>> = Commands<InstanceType<Ctor>>,
> = ReturnType<typeof commandMessageClassFactory<Ctor, InstanceType<Ctor>, Command>>;

export type CommandMessage<
  SvcFQN extends FQN = FQN,
  Command extends string = string,
  Param extends ValueObject = ValueObject
> = ValueObject<
  CommandMessageFQN,
  Compute<
    Infer<typeof singleMessageSchema> &
    {
      payload: {
        serviceFQN: SvcFQN;
        command: Command;
        param: Param;
      }
    }
  >
>;