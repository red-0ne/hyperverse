import { FQN, ValueObjectConstructor, ValueObjectFQN } from "../value-object";
import { DeferredReplyConstructor, Commands } from "../messaging";
import {
  ExposableService,
  CommandsConfig,
  ServiceConfigs,
  ExposableServiceConstructor,
  ServiceToken,
} from "./service";

export type ValueObjectMap<Name extends ValueObjectFQN = ValueObjectFQN> = Map<Name, ValueObjectConstructor<Name>>;

export class NamingService {
  public readonly fqnKey = "Hyperverse::Core::FQN::0" as const;

  #serviceConfigs: ServiceConfigs = {};
  #valueObjectConstructors: ValueObjectMap = new Map();

  public registerCommand<SvcCtor extends ExposableServiceConstructor>(
    service: SvcCtor,
    command: Commands<InstanceType<SvcCtor>>,
    paramValidator: ValueObjectConstructor,
    returnValidator: DeferredReplyConstructor,
  ) {
    if (!this.#serviceConfigs[service.FQN]) {
      this.#serviceConfigs[service.FQN] = {
        commands: {},
        token: service.token,
        service,
      };
    } else if (service !== this.#serviceConfigs[service.FQN]?.service) {
      throw new Error("Service already registered");
    }

    const commandsConfig = this.#serviceConfigs[service.FQN]!.commands;

    if (commandsConfig[command]) {
      throw new Error("Command already registered");
    }

    // @ts-expect-error (command/data)MsgCtor is not defined here since it would
    // trigger a circular dependency. This should be done in the runner level
    // with the populateCommandValueObjects method
    const cmdConfig: CommandsConfig[typeof command] = {
      //commandMsgCtor: commandMessageClassFactory(service, command),
      //dataMsgCtor: dataMessageClassFactory(service, command),
      service,
      paramFQN: paramValidator?.FQN,
      returnFQNs: [
        returnValidator.success.FQN,
        ...returnValidator.failures.map(f => f.FQN),
      ] as const,
      exposed: false,
    };

    commandsConfig[command] = cmdConfig;
  }

  public getCommandConfig(serviceName: FQN, command: string): CommandsConfig[string] | undefined {
    return this.#serviceConfigs?.[serviceName]?.commands?.[command];
  }

  public exposeCommand(serviceName: FQN, command: string): void {
    const serviceConfig = this.#serviceConfigs?.[serviceName];
    if (!serviceConfig) {
      throw new Error("Service not registered");
    }

    const commandConfig = serviceConfig.commands[command];
    if (!commandConfig) {
      throw new Error("Command not registered");
    }

    commandConfig.exposed = true;
  }

  public getServiceToken(serviceName: FQN): ServiceToken<ExposableService<FQN>> | undefined {
    return this.#serviceConfigs?.[serviceName]?.token;
  }

  public registerValueObject(ctor: ValueObjectConstructor): void {
    if (this.#valueObjectConstructors.has(ctor.FQN)) {
      throw new Error("Already registered");
    }

    this.#valueObjectConstructors.set(ctor.FQN, ctor);
  }

  public getValueObjectConstructor<Name extends ValueObjectFQN, VOCtor extends ValueObjectConstructor<Name>>(name: Name): VOCtor {
    const ctor = this.#valueObjectConstructors.get(name) as VOCtor | undefined;

    if (!ctor) {
      throw new Error("Not registered");
    }

    return ctor;
  }

  // we call this at the runner level ans with callbacks to avoid circular dependencies
  // between the naming service and the value objects created early (errors and commands)
  public populateCommandValueObjects(callback: (commandConfig: CommandsConfig[string], command: string) => void): void {
    for (const serviceFQN in this.#serviceConfigs) {
      const serviceConfig = this.#serviceConfigs[serviceFQN as FQN]!;
      for (const command in serviceConfig.commands) {
        const commandConfig = serviceConfig.commands[command]!;
        callback(commandConfig, command);
      }
    }
  }
}

export const CoreNamingService = new NamingService();
export type CoreNamingService = typeof CoreNamingService;