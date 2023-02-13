import { FQN, ValueObjectConstructor, ValueObjectFQN } from "../value-object/types";
import { ServiceConfig, ServiceConfigMap, ValueObjectMap } from "./types";

export class NamingService {
  public readonly fqnKey = "Hyperverse::Core::FQN::0" as const;

  #serviceConfigs: ServiceConfigMap = new Map();
  #valueObjectConstructors: ValueObjectMap = new Map();

  public registerService(name: FQN, config: ServiceConfig) {
    if (this.#serviceConfigs.has(name)) {
      throw new Error("Already registered");
    }

    this.#serviceConfigs.set(name, config);
  }

  public getServiceConfig(name: FQN): ServiceConfig {
    const config = this.#serviceConfigs.get(name);

    if (config === undefined) {
      throw new Error("Not registered");
    }

    return config;
  }

  public serviceConfigs() {
    const config: { [service in FQN]: { [method: string]: ServiceConfig["commands"] } } = {};
    for (const [serviceName, serviceConfig] of this.#serviceConfigs.entries()) {
      const cfg: { [method: string]: ServiceConfig["commands"] } = {};
      for (const method in serviceConfig.commands) {
        if (serviceConfig.exposed.includes(method)) {
          const command = serviceConfig.commands[method];
          if (command === undefined) {
            throw new Error("Invalid config");
          }

          cfg[method] = command;
        }
      }

      config[serviceName] = cfg;
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