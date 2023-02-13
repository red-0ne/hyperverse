import z from "myzod"
import { DependencyBundleTokenMap } from "../di-bundle/types";
import { DeferredReply } from "../messaging/deferred";
import { Constructor } from "../utils";
import { FQN, ValueObject, valueObjectClassFactory, ValueObjectConstructor } from "../value-object";
import { ValueObjectFQN } from "../value-object/types";

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
  new(args: Args): Svc,
  FQN: Name,
};

export type ServiceConfig<Svc extends ServiceConstructor = ServiceConstructor> = {
  commands: {
    [command in keyof InstanceType<Svc>]: {
      params: Parameters<InstanceType<Svc>[command]>[0] extends ValueObject
        ? ValueObjectConstructor<
            Parameters<InstanceType<Svc>[command]>[0]["FQN"],
            Parameters<InstanceType<Svc>[command]>[0]
          >
        : never,
      return: ReturnType<InstanceType<Svc>[command]> extends DeferredReply
        ? DeferredReply
        : never,
    }
  },
  exposed: (keyof InstanceType<Svc> & string)[],
};

export type ValueObjectMap<Name extends ValueObjectFQN = ValueObjectFQN> =
  Map<Name, ValueObjectConstructor<Name>>;

export type ServiceConfigMap<ServiceName extends FQN = FQN> = Map<ServiceName, ServiceConfig>

export const peerIdSchema = z.object({ value: z.string() }); // this should be a public key
export class PeerId extends valueObjectClassFactory("Core::ValueObject::PeerId", peerIdSchema) {}

export const peerInfoSchema = z.object({
  peerId: PeerId.schema(),
  hosts: z.array(z.string().map(v => new URL(v))),
});
export class PeerInfo extends valueObjectClassFactory("Core::ValueObject::PeerInfo", peerInfoSchema) {}