import { Inject, Injectable, InjectionToken, Injector } from "injection-js";
import { NetworkingServiceToken } from "../networking/networking";
import { PeerUpdated } from "./events";
import { CoreNamingService } from "./naming-service";
import { PeerUpdatesStreamToken } from "./service-registry";
import { PeerId, PeerInfo, Service, ServiceConfigs } from "./types";
import { dependencyBundleFactory } from "../di-bundle";
import { ErrorObject } from "../errors";
import { DataMessage, CommandMessage, commandMessageFQN, dataMessageFQN } from "../messaging";
import { CommandNotFound, InternalError, InvalidData, InvalidMessage, ServiceNotInjected, ServiceUnavailable, UnexpectedError, UnknownCommand, UnknownService, UnknownStreamId } from "./errors";
import { StreamService } from "../stream/stream-service";

const IdentityServiceToken = new InjectionToken<{
  getPeerInfo: () => PeerInfo,
}>("IdentityService")

export const LoggingStreamToken = new InjectionToken<StreamService>("Foo");

export class RunnerDeps extends dependencyBundleFactory({
  peerUpdates: PeerUpdatesStreamToken,
  logger: LoggingStreamToken,
  networking: NetworkingServiceToken,
  identity: IdentityServiceToken,
}) {}

@Injectable()
export class Runner {
  readonly #peers = new Map<PeerId["value"], PeerUpdated>();
  readonly #dataStreams = new Map<string, any>();
  readonly #peerInfo: PeerInfo;
  readonly #exposedServices: { [key: string]: string[] } = {};
  readonly #serviceConfigs: ServiceConfigs = {};
  readonly #deps: RunnerDeps;

  constructor(deps: RunnerDeps, @Inject(Injector) protected readonly injector: Injector) {
    this.#deps = deps;
    this.#peerInfo = this.#deps.identity.getPeerInfo();
  }

  protected async start() {
    this.subscribeToPeerUpdates();
    this.handleMessages();
    await this.setupLocalServices();
  }

  protected async setupLocalServices() {
    await this.#deps.peerUpdates.emit(PeerUpdated.from({
      peerInfo: this.#peerInfo,
      services: this.#exposedServices
    }));
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

  protected async handleIncomingData(data: DataMessage<any, any>) {
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
    const { serviceFQN, command, params } = payload;
    const exposedService = this.#exposedServices[serviceFQN];

    let error: ErrorObject | undefined;

    if (exposedService === undefined) {
      error = new UnknownService({ serviceFQN });
    }

    const exposedMethodParams = exposedService[command];
    if (exposedMethodParams === undefined) {
      error = new UnknownCommand({ serviceFQN, command });
    }

    if (params.FQN !== exposedMethodParams) {
      error = new ServiceUnavailable({ serviceFQN, command });
    }

    if (error !== undefined) {
      this.#deps.networking.send(error, id, origin);
      return;
    }

    const service: Service<typeof serviceFQN> = this.injector.get(serviceFQN);
    if (service === undefined) {
      this.#deps.logger.emit(new ServiceNotInjected({ context: cmd }));
      this.#deps.networking.send(new InternalError(), id, origin);

      return;
    }

    if (typeof service[command] !== "function") {
      this.#deps.logger.emit(new CommandNotFound({ context: cmd }));
      this.#deps.networking.send(new InternalError(), id, origin);

      return;
    }

    try {
      // @ts-ignore - we know the command exists
      const response = await service[command](params);
      this.#deps.networking.send(response, id, origin);
    } catch (e) {
      this.#deps.logger.emit(new UnexpectedError({ error: e, context: cmd }));
      this.#deps.networking.send(new InternalError(), id, origin);
    }
  }
}