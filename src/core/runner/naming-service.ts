import { FQN, ValueObjectConstructor, ValueObjectFQN } from "../value-object/types";
import { ServiceConfig, ServiceConfigs, ValueObjectMap } from "./types";

export class NamingService {
  public readonly fqnKey = "Hyperverse::Core::FQN::0" as const;

  #serviceConfigs: ServiceConfigs = {};
  #valueObjectConstructors: ValueObjectMap = new Map();

  public registerService(name: FQN, config: ServiceConfig) {
    if (this.#serviceConfigs[name] !== undefined) {
      throw new Error("Already registered");
    }

    this.#serviceConfigs[name] = config;
  }

  public getServiceConfig(name: FQN): ServiceConfig {
    const config = this.#serviceConfigs[name];

    if (config === undefined) {
      throw new Error("Not registered");
    }

    return config;
  }

  public registerValueObject(ctor: ValueObjectConstructor) {
    if (this.#valueObjectConstructors.has(ctor.FQN)) {
      throw new Error("Already registered");
    }

    this.#valueObjectConstructors.set(ctor.FQN, ctor);
  }

  public getValueObjectConstructor<
    Name extends ValueObjectFQN,
    VOCtor extends ValueObjectConstructor<Name>,
  >(name: Name) {
    const ctor = this.#valueObjectConstructors.get(name) as VOCtor | undefined;

    if (!ctor) {
      throw new Error("Not registered");
    }

    return ctor;
  }
}

export const CoreNamingService = new NamingService();
export type CoreNamingService = typeof CoreNamingService;