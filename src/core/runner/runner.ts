import { Inject, Injectable, InjectionToken, Injector } from "injection-js";
import { ErrorObject } from "../errors";
import { StreamService } from "../stream";
import { FQN, isValueObject } from "../value-object";
import { NetworkingServiceToken } from "../networking";
import { dependencyBundleFactory } from "../di-bundle";
import {
  PeerId,
  PeerInfo,
  DataMessage,
  CommandMessage,
  commandMessageFQN,
  dataMessageFQN,
  DataMessageConstructor,
  commandMessageClassFactory,
  dataMessageClassFactory,
} from "../messaging";
import { ValueObject } from "../value-object";
import { Compute, Constructor } from "../utils";

import { PeerUpdated } from "./events";
import { CoreNamingService } from "./naming-service";
import { PeerUpdatesStreamToken } from "./service-registry";
import { ExposedServicesToken, ExposableService, ServiceToken } from "./service";

import {
  InvalidParameters,
  CommandNotFound,
  InternalError,
  InvalidData,
  InvalidMessage,
  ServiceNotInjected,
  ServiceUnavailable,
  UnexpectedError,
  UnknownStreamId,
  InvalidReturn,
} from "./errors";
import { UnknownCommand } from "../messaging/errors";

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
  readonly #injector: Injector;

  constructor(deps: RunnerDeps, @Inject(Injector) injector: Injector) {
    this.#deps = deps;
    this.#injector = injector;
    this.#peerInfo = this.#deps.identity.getPeerInfo();

    this.#ready = this.start();
  }

  public ready(): Promise<void> {
    return this.#ready;
  }

  protected async start(): Promise<void> {
    CoreNamingService.populateCommandValueObjects((commandConfig, command) => {
      commandConfig.commandMsgCtor = commandMessageClassFactory(
        commandConfig.service,
        // @ts-expect-error commandConfig.service has never as command keys
        command,
      );
      commandConfig.dataMsgCtor = dataMessageClassFactory(
        commandConfig.service,
        // @ts-expect-error commandConfig.service has never as command keys
        command,
      );
    });
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
    let responseCtor = commandConfig?.dataMsgCtor as Compute<
      DataMessageConstructor &
      Constructor<DataMessage, [{ [key: string]: unknown, payload: ValueObject }]>
    >;


    if (commandConfig === undefined) {
      error = new UnknownCommand({ context: payload });
      // @ts-expect-error UnknownCommandMessage should be of same shape of DataMessage
      responseCtor = UnknownCommandMessage;
    } else if (!commandConfig.exposed) {
      error = new ServiceUnavailable({ context: cmd });
    } else if (commandConfig.paramFQN !== param.FQN) {
      error = new InvalidParameters({ context: cmd, expectedFQN: commandConfig.paramFQN });
    }

    if (error !== undefined) {
      this.#deps.networking.send(new responseCtor({
        id,
        sequence: 0,
        length: 1,
        end: true,
        origin,
        payload: error,
      }));
      return;
    }

    const serviceToken = CoreNamingService.getServiceToken(serviceFQN) as ServiceToken<ExposableService>;
    const service = this.#injector.get(serviceToken);
    if (service === undefined) {
      const err = new ServiceNotInjected({ context: cmd });
      this.#deps.logger.emit(err);
      // should have ref pointing to something that references the original error
      // maybe the Id of its log
      this.#deps.networking.send(new responseCtor({
        id,
        sequence: 0,
        length: 1,
        end: true,
        origin,
        payload: new InternalError({ ref: err }),
      }));

      return;
    }

    // @ts-expect-error CommandConfig type does not have key signature
    if (typeof service[command] !== "function") {
      const err = new CommandNotFound({ context: cmd });
      this.#deps.logger.emit(err);
      // should have ref pointing to something that references the original error
      this.#deps.networking.send(new responseCtor({
        id,
        sequence: 0,
        length: 1,
        end: true,
        origin,
        payload: new InternalError({ ref: err }),
      }));

      return;
    }

    try {
      // We should support single message responses as well as stream responses
      // Maybe through a StreamReply class just like DeferredReply
      // @ts-expect-error we know the command exists
      const response: ValueObject = await service[command](param);
      // @ts-expect-error commandConfig should already be checked earlier
      const returnFQNs = commandConfig.returnFQNs;

      if (isValueObject(response) && returnFQNs.includes(response.FQN)) {
        this.#deps.networking.send(new responseCtor({
          id,
          sequence: 0,
          length: 1,
          end: true,
          origin,
          payload: response,
        }));
      } else {
        const err = new InvalidReturn({
          context: cmd,
          expectedFQNs: [...returnFQNs],
          actualFQN: response?.FQN,
        });

        this.#deps.logger.emit(err);
        this.#deps.networking.send(new responseCtor({
          id,
          sequence: 0,
          length: 1,
          end: true,
          origin,
          payload: new InternalError({ ref: err }),
        }));
      }
    } catch (e) {
      const err = new UnexpectedError({ error: e, context: cmd });

      this.#deps.logger.emit(err);
      this.#deps.networking.send(new responseCtor({
        id,
        sequence: 0,
        length: 1,
        end: true,
        origin,
        payload: new InternalError({ ref: err }),
      }));
    }
  }
}
