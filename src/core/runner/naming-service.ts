import { DeferredReply } from "../messaging";
import { FQN, ValueObjectConstructor, ValueObjectFQN } from "../value-object/types";
import { Service, CommandsConfig, ServiceConfigs, ServiceConstructor, ServiceToken, ValueObjectMap } from "./types";

export class NamingService {
  public readonly fqnKey = "Hyperverse::Core::FQN::0" as const;

  #serviceConfigs: ServiceConfigs = {};
  #valueObjectConstructors: ValueObjectMap = new Map();

  public registerCommand(
    service: ServiceConstructor,
    command: string,
    paramValidator: ValueObjectConstructor | undefined,
    returnValidator: DeferredReply,
  ) {
    const serviceConfig =
      this.#serviceConfigs[service.FQN] ||
      { commands: {}, token: service.token };

    if (serviceConfig.commands?.[command]) {
      throw new Error("Already registered");
    }

    serviceConfig.commands[command] = {
      paramFQN: paramValidator?.FQN,
      returnFQNs: [
        returnValidator.success.FQN,
        ...returnValidator.failures.map(f => f.FQN),
      ],
      exposed: false,
    };
  }

  public getCommandConfig(serviceName: FQN, command: string): CommandsConfig[string] | undefined {
    return this.#serviceConfigs?.[serviceName]?.commands?.[command];
  }

  public exposeCommand(serviceName: FQN, command: string): void {
    const serviceConfig = this.#serviceConfigs?.[serviceName];
    if (!serviceConfig) {
      throw new Error("Not registered");
    }

    const commandConfig = serviceConfig.commands[command];
    if (!commandConfig) {
      throw new Error("Not registered");
    }

    commandConfig.exposed = true;
  }

  public getServiceToken(serviceName: FQN): ServiceToken<Service<FQN>> | undefined {
    return this.#serviceConfigs?.[serviceName]?.token;
  }

  public registerValueObject(ctor: ValueObjectConstructor): void {
    if (this.#valueObjectConstructors.has(ctor.FQN)) {
      throw new Error("Already registered");
    }

    this.#valueObjectConstructors.set(ctor.FQN, ctor);
  }

  public getValueObjectConstructor<
    Name extends ValueObjectFQN,
    VOCtor extends ValueObjectConstructor<Name>,
  >(name: Name): VOCtor {
    const ctor = this.#valueObjectConstructors.get(name) as VOCtor | undefined;

    if (!ctor) {
      throw new Error("Not registered");
    }

    return ctor;
  }
}

export const CoreNamingService = new NamingService();
export type CoreNamingService = typeof CoreNamingService;