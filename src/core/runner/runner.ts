import { Inject, Injectable, InjectionToken, Injector } from "injection-js";
import { NetworkingServiceToken } from "../networking/networking";
import { PeerUpdated } from "./events";
import { CoreNamingService } from "./naming-service";
import { PeerUpdatesStreamToken } from "./service-registry";
import { PeerId, PeerInfo } from "./types";
import { ExposedServicesToken, ExposableService } from "./service";
import { dependencyBundleFactory } from "../di-bundle";
import { ErrorObject } from "../errors";
import { StreamService } from "../stream/stream-service";
import { isValueObject } from "../value-object/value-object-factory";

import { DataMessage, CommandMessage, commandMessageFQN, dataMessageFQN } from "../messaging";

import {
  InvalidParameters,
  CommandNotFound,
  InternalError,
  InvalidData,
  InvalidMessage,
  ServiceNotInjected,
  ServiceUnavailable,
  UnexpectedError,
  UnknownCommand,
  UnknownStreamId,
  InvalidReturn,
} from "./errors";

export class RunnerDeps extends dependencyBundleFactory({
  peerUpdates: PeerUpdatesStreamToken,
  logger: new InjectionToken<StreamService>("Foo"),
  networking: NetworkingServiceToken,
  // Have a proper impl for identity
  identity: new InjectionToken<{ getPeerInfo: () => PeerInfo }>("IdentityService"),
  exposedServices: ExposedServicesToken,
}) {}

@Injectable()
export class Runner {
  readonly #peers = new Map<PeerId["value"], PeerUpdated>();
  readonly #dataStreams = new Map<string, any>();
  readonly #peerInfo: PeerInfo;
  readonly #deps: RunnerDeps;
  readonly #ready: Promise<void>;

  constructor(deps: RunnerDeps, @Inject(Injector) protected readonly injector: Injector) {
    this.#deps = deps;
    this.#peerInfo = this.#deps.identity.getPeerInfo();

    this.#ready = this.start();
  }

  public ready(): Promise<void> {
    return this.#ready;
  }

  protected async start(): Promise<void> {
    this.subscribeToPeerUpdates();
    this.handleMessages();
    await this.publishExposedServices();
  }

  protected async publishExposedServices() {
    for (const [serviceName, serviceConfig] of Object.entries(this.#deps.exposedServices)) {
      for (const commandName of serviceConfig) {
        // @ts-expect-error serviceName is a FQN
        CoreNamingService.exposeCommand(serviceName, commandName);
      }
    }

    await this.#deps.peerUpdates.emit(
      PeerUpdated.withPayload({
        peerInfo: this.#peerInfo,
        services: this.#deps.exposedServices,
      }),
    );
  }

  protected async subscribeToPeerUpdates() {
    for await (const peerUpdate of this.#deps.peerUpdates.stream()) {
      const peerId = peerUpdate.payload.peerInfo.peerId.value;
      this.#peers.set(peerId, peerUpdate);
    }
  }

  protected async handleMessages() {
    for await (const message of this.#deps.networking.messages()) {
      if (message.FQN.indexOf("Core::ValueObject::Message::") !== 0) {
        this.#deps.logger.emit(new InvalidMessage({ context: message }));
      }

      if (message.FQN.indexOf(commandMessageFQN) === 0) {
        this.handleIncomingCommand(message as CommandMessage);
      } else if (message.FQN.indexOf(dataMessageFQN) === 0) {
        this.handleIncomingData(message as DataMessage);
      }
    }
  }

  protected async handleIncomingData(data: DataMessage) {
    const stream = this.#dataStreams.get(data.id);
    if (stream === undefined) {
      this.#deps.logger.emit(new UnknownStreamId({ context: data }));
      return;
    }

    if (!stream.isValid(data)) {
      this.#deps.logger.emit(new InvalidData({ expectedFQN: stream.FQN, context: data }));
      return;
    }

    // should we next the logged error to the stream?
    stream.next(data);

    if (data.end) {
      stream.done();
      this.#dataStreams.delete(data.id);
    }
  }

  protected async handleIncomingCommand(cmd: CommandMessage) {
    const { payload, origin, id } = cmd;
    const { serviceFQN, command, param } = payload;
    // Naming service should be injectable (?)
    const commandConfig = CoreNamingService.getCommandConfig(serviceFQN, command);

    let error: ErrorObject | undefined;

    if (commandConfig === undefined) {
      error = new UnknownCommand({ context: cmd });
    } else if (!commandConfig.exposed) {
      error = new ServiceUnavailable({ context: cmd });
    } else if (commandConfig.paramFQN !== param.FQN) {
      error = new InvalidParameters({ context: cmd, expectedFQN: commandConfig.paramFQN });
    }

    if (error !== undefined) {
      this.#deps.networking.send(error, id, origin);
      return;
    }

    const serviceToken = CoreNamingService.getServiceToken(serviceFQN);
    const service: ExposableService = this.injector.get(serviceToken);
    if (service === undefined) {
      const err = new ServiceNotInjected({ context: cmd });
      this.#deps.logger.emit(err);
      // should have ref pointing to something that references the original error
      this.#deps.networking.send(new InternalError({ ref: err }), id, origin);

      return;
    }

    // @ts-expect-error CommandConfig type does not have key signature
    if (typeof service[command] !== "function") {
      const err = new CommandNotFound({ context: cmd });
      this.#deps.logger.emit(err);
      // should have ref pointing to something that references the original error
      this.#deps.networking.send(new InternalError({ ref: err }), id, origin);

      return;
    }

    try {
      // @ts-expect-error we know the command exists
      const response = await service[command](param);
      // @ts-expect-error commandConfig should already be checked earlier
      const returnFQNs = commandConfig.returnFQNs;

      if (isValueObject(response) && returnFQNs.includes(response.FQN)) {
        this.#deps.networking.send(response, id, origin);
      } else {
        const err = new InvalidReturn({
          context: cmd,
          expectedFQNs: [...returnFQNs],
          actualFQN: response?.FQN,
        });
        this.#deps.logger.emit(err);
        this.#deps.networking.send(new InternalError({ ref: err }), id, origin);
      }
    } catch (e) {
      const err = new UnexpectedError({ error: e, context: cmd });
      this.#deps.logger.emit(err);
      this.#deps.networking.send(new InternalError({ ref: err }), id, origin);
    }
  }
}
