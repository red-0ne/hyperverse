import { InjectionToken } from "injection-js";
import { DependencyBundleTokenMap } from "../di-bundle/types";
import { ErrorObjectFQN } from "../errors";
import { Constructor } from "../utils";
import { FQN } from "../value-object";
import { ValueObjectFQN } from "../value-object/types";

export type ExposableService<Name extends FQN = FQN, Commands extends string = any> = {
  readonly FQN: Name,
  readonly ready: Promise<void>,
}

export type ExposableServiceConstructor<
  Name extends FQN = FQN,
  Svc extends ExposableService<Name> = ExposableService<Name>,
  Args extends DependencyBundleTokenMap = DependencyBundleTokenMap,
> = {
  deps: Constructor<DependencyBundleTokenMap>;
  token: ServiceToken<Svc>;
  new (args: Args): Svc;
  FQN: Name;
};

export class ServiceToken<S extends ExposableService = ExposableService> extends InjectionToken<S> {
  constructor(public readonly name: FQN) {
    super(name);
  }
}

export type CommandsConfig = Record<string, {
  paramFQN: ValueObjectFQN | undefined,
  returnFQNs: Readonly<[ValueObjectFQN, ...ErrorObjectFQN[]]>,
  exposed: boolean,
}>;

export type ServiceConfigs = Record<
  FQN,
  {
    commands: CommandsConfig;
    token: ServiceToken;
  }
>;

export type ExposedServices = Record<FQN, string[]>;
export const ExposedServicesToken = new InjectionToken<ExposedServices>("ExposedServices");
