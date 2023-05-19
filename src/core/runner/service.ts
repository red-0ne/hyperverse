import { InjectionToken } from "injection-js";
import { DependencyBundleTokenMap } from "../di-bundle/types";
import { ErrorObjectFQN } from "../errors";
import { FQN } from "../value-object";
import { ValueObjectFQN } from "../value-object/types";
import { dependencyBundleFactory } from "../di-bundle";

export function exposableServiceFactory<
  Name extends FQN,
  DepsCtor extends ReturnType<typeof dependencyBundleFactory<DependencyBundleTokenMap>>,
  Svc extends ExposableService,
>(
  name: Name,
  deps: DepsCtor,
  token: ServiceToken<Svc>,
) {
  class ExposableSvc {
    public static readonly FQN = name;
    public static readonly deps = deps;
    public static readonly token = token;

    public readonly FQN = name;

    public ready(): Promise<void> {
      return Promise.resolve();
    }
  }

  return ExposableSvc as ExposableServiceConstructor<Name, DependencyBundleTokenMap, DepsCtor>;
}

export type ExposableServiceConstructor<
  Name extends FQN = any,
  TM extends DependencyBundleTokenMap = any,
  Deps extends ReturnType<typeof dependencyBundleFactory<TM>> = any,
> = {
  FQN: Name,
  deps: Deps,
  token: ServiceToken<ExposableService<Name>>,
  new(deps?: InstanceType<Deps>): ExposableService<Name>,
};

export type ExposableService<
  Name extends FQN = any,
> = { FQN: Name, ready(): Promise<void> };

export class ServiceToken<S extends ExposableService = ExposableService> extends InjectionToken<S> {
  constructor(public readonly name: S["FQN"]) {
    super(name);
  }
}

export type CommandsConfig<FQN extends ValueObjectFQN = ValueObjectFQN> = Record<string, {
  paramFQN: FQN,
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
