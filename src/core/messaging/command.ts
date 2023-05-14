import z, { Infer, MappedType, ObjectType } from "myzod";
import { CoreNamingService } from "../runner/naming-service";
import { ExposableServiceConstructor } from "../runner/service";
import { valueObjectClassFactory } from "../value-object";
import { FQN, ValueObject, ValueObjectFQN } from "../value-object/types";
import { DeferredReply } from "./deferred";
import { messageSchema } from "./message";
import { Compute } from "../utils";

export type Commands<Svc> = {
  [Command in keyof Svc]: Svc[Command] extends (arg: infer A) => DeferredReply ? A extends ValueObject ? Command : never : never;
}[keyof Svc] & string;

type CommandParam<
  Svc extends InstanceType<ExposableServiceConstructor>,
  Command extends Commands<Svc>
> = Svc[Command] extends (arg: infer Args) => DeferredReply
  ? Args extends ValueObject
    ? Args
    : never
  : never;

export type CommandMessageFQN<Implementation extends string = string> = ValueObjectFQN<"Core", `Message::Command::${Implementation}`>;

export const commandMessageFQN: CommandMessageFQN = `Core::ValueObject::Message::Command::`;

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
  const ParamVO  = CoreNamingService.getValueObjectConstructor(paramFQN);
  const fqn: CommandMessageFQN<`${Svc["FQN"]}::${Command}`> = `${commandMessageFQN}${serviceCtor.FQN}::${commandName}` as any;
  const validator = z.object({
    ...messageSchema.shape(),
    payload: z.object({
      serviceFQN: z.literal(serviceCtor.FQN as Svc["FQN"]),
      command: z.literal(commandName),
      param: ParamVO.schema() as MappedType<Param>,
    }),
  });
type t = ReturnType<(typeof validator)["shape"]>["payload"];
  const cmdCtor = valueObjectClassFactory<CommandMessageFQN, typeof validator>(
    fqn,
    validator
  );

  return cmdCtor;
}

export type CommandMessageConstructor<
  Ctor extends ExposableServiceConstructor = any,
  Command extends Commands<InstanceType<Ctor>> = any,
> = ReturnType<typeof commandMessageClassFactory<Ctor, Command>>;

export type CommandMessage<
  SvcFQN extends FQN = FQN,
  Command extends string = string,
  Param extends ValueObject = ValueObject
> = ValueObject<
  CommandMessageFQN,
  Compute<
    Infer<typeof messageSchema> &
    {
      payload: {
        serviceFQN: SvcFQN;
        command: Command;
        param: Param;
      }
    }
  >
>;