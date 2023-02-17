import { InjectionToken } from "injection-js";
import { DependencyBundleTokenMap } from "../di-bundle/types";
import { ErrorObjectFQN } from "../errors";
import { DeferredReply } from "../messaging";
import { Constructor } from "../utils";
import { FQN, ValueObject } from "../value-object";
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
  paramFQN: ValueObjectFQN | ErrorObjectFQN | undefined,
  returnFQNs: ValueObjectFQN[],
  exposed: boolean,
}>;

export type ServiceConfigs = Record<FQN, {
  commands: CommandsConfig,
  token: ServiceToken,
}>;

export type ExposedServices = Record<FQN, string[]>;
export const ExposedServicesToken = new InjectionToken<ExposedServices>("ExposedServices");