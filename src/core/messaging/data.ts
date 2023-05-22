import z, { MappedType } from "myzod";
import { ExposableServiceConstructor, CoreNamingService } from "../runner";
import { valueObjectClassFactory, ValueObjectConstructor, ValueObjectFQN } from "../value-object";
import { ErrorObjectConstructor } from "../errors";
import { messageSchema } from "./message";
import { Commands } from "./command";
import { DeferredReply } from "./deferred";


export type DataMessageFQN<Implementation extends string = string> = ValueObjectFQN<"Core", `Message::Data::${Implementation}`>;
export const dataMessageFQN = "Core::ValueObject::Message::Data::";

type CommandResult<
  Svc extends InstanceType<ExposableServiceConstructor>,
  Command extends Commands<Svc>
> = Svc[Command] extends (arg: any) => infer R
  ? R extends DeferredReply<infer Success, infer Failure>
    ? InstanceType<Success> | InstanceType<Failure[number]>
    : never
  : never;

export function dataMessageClassFactory<
  Ctor extends ExposableServiceConstructor,
  Svc extends InstanceType<Ctor>,
  Command extends Commands<Svc>,
  Reply extends CommandResult<Svc, Command>
>(serviceCtor: Ctor, commandName: Command) {
  const serviceConfig = CoreNamingService.getCommandConfig(serviceCtor.FQN, commandName);
  if (!serviceConfig) {
    throw new Error(`Service ${serviceCtor.FQN} does not have a command named ${commandName}`);
  }

  const [successFQN, ...failureFQNs] = serviceConfig.returnFQNs;
  const svcFQN: Ctor["FQN"] = serviceCtor.FQN;
  const success: ValueObjectConstructor = CoreNamingService.getValueObjectConstructor(successFQN);
  const failures: ErrorObjectConstructor[] = failureFQNs.map(f => CoreNamingService.getValueObjectConstructor(f));
  const result = [success, ...failures];
  const fqn: DataMessageFQN<`${Ctor["FQN"]}::${Command}`> = `${dataMessageFQN}${svcFQN}::${commandName}`;
  const validator = z.object({
    ...messageSchema.shape(),
    payload: z.union(result.map(r => r.schema())) as unknown as MappedType<Reply>,
  });

  const dataCtor = valueObjectClassFactory(fqn, validator);

  return dataCtor;
}

export type DataMessageConstructor<
  Ctor extends ExposableServiceConstructor = ExposableServiceConstructor,
  Command extends Commands<InstanceType<Ctor>> = Commands<InstanceType<Ctor>>,
> = ReturnType<typeof dataMessageClassFactory<Ctor, InstanceType<Ctor>, Command, CommandResult<InstanceType<Ctor>, Command>>>;

export type DataMessage<
  Ctor extends ExposableServiceConstructor = ExposableServiceConstructor,
  Command extends Commands<InstanceType<Ctor>> = Commands<InstanceType<Ctor>>,
> = InstanceType<DataMessageConstructor<Ctor, Command>>;