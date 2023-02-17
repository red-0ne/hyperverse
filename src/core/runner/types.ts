import { InjectionToken } from "injection-js";
import z from "myzod"
import { DependencyBundleTokenMap } from "../di-bundle/types";
import { DeferredReply } from "../messaging/deferred";
import { Constructor } from "../utils";
import { FQN, ValueObject, valueObjectClassFactory, ValueObjectConstructor } from "../value-object";
import { ValueObjectFQN } from "../value-object/types";

export type ValueObjectMap<Name extends ValueObjectFQN = ValueObjectFQN>
  = Map<Name, ValueObjectConstructor<Name>>;

export type Service<Name extends FQN = FQN> = {
  [method: string]: (args?: ValueObject) => DeferredReply,
} & {
  readonly FQN: Name,
  readonly ready: Promise<void>,
};

export type ServiceConstructor<
  Name extends FQN = FQN,
  Svc extends Service<Name> = Service<Name>,
  Args extends DependencyBundleTokenMap = DependencyBundleTokenMap,
> = {
  deps: Constructor<DependencyBundleTokenMap>,
  token: ServiceToken<Svc>
  new(args: Args): Svc,
  FQN: Name,
};
export class ServiceToken<S extends Service = Service> extends InjectionToken<S> {
  constructor(public readonly name: FQN) {
    super(name);
  }
}

export type CommandsConfig = Record<string, {
  paramFQN: ValueObjectFQN | undefined,
  returnFQNs: ValueObjectFQN[],
  exposed: boolean,
}>;
export type ServiceConfigs = Record<FQN, {
  commands: CommandsConfig,
  token: ServiceToken,
}>;

export const peerIdSchema = z.object({ value: z.string() }); // this should be a public key
export class PeerId extends valueObjectClassFactory(
  "Core::ValueObject::PeerId",
  peerIdSchema
) {}

export const peerInfoSchema = z.object({
  peerId: PeerId.schema(),
  hosts: z.array(z.string().map(v => new URL(v))),
});
export class PeerInfo extends valueObjectClassFactory(
  "Core::ValueObject::PeerInfo",
  peerInfoSchema
) {}
