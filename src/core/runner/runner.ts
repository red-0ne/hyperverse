import { Inject, Injectable, InjectionToken, Injector } from "injection-js";
import { ErrorObject, ErrorObjectConstructor } from "../errors";
import { StreamService } from "../stream";
import { FQN, ValueObjectConstructor, isValueObject } from "../value-object";
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
  Message,
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
  UnknownCommId,
  InvalidReturn,
} from "./errors";
import { UnknownCommand, UnknownCommandMessage } from "../messaging/errors";
import { DeferredReply, DeferredReplyConstructor } from "../messaging/deferred";

export const LoggerServiceToken = new InjectionToken<StreamService>("LoggerService");

export class RunnerDeps extends dependencyBundleFactory({
  peerUpdates: PeerUpdatesStreamToken,
  logger: LoggerServiceToken,
  networking: NetworkingServiceToken,
  // Have a proper impl for identity
  identity: new InjectionToken<{ getPeerInfo: () => PeerInfo }>("IdentityService"),
  exposedServices: ExposedServicesToken,
}) {}

@Injectable()
export class Runner {
  readonly #peers = new Map<PeerId["value"], PeerUpdated>();
  readonly #peerInfo!: PeerInfo;
  readonly #deps!: RunnerDeps;
  readonly #ready!: Promise<void>;
  readonly #injector!: Injector;
  readonly #replies = new Map<
    PeerId["id"], Map<
      PeerInfo["hosts"][number], Map<
        Message["id"], {
          promise?: DeferredReply<
            ValueObjectConstructor,
            Readonly<ErrorObjectConstructor[]>
          >,
          resolve?: (value: ValueObject) => void,
          validResult: DeferredReplyConstructor,
        }
      >
    >
  >();

  constructor(deps: RunnerDeps, @Inject(Injector) injector: Injector) {
    this.#deps = deps;
    this.#injector = injector;
    this.#peerInfo = this.#deps.identity.getPeerInfo();

    this.#ready = this.start();
  }

  public ready(): Promise<void> {
    return this.#ready;
  }

  public isExposed(serviceFQN: FQN, command: string): boolean {
    return !!this.#deps.exposedServices[serviceFQN]?.includes(command);
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
      if (message.FQN.indexOf(commandMessageFQN) === 0) {
        this.handleIncomingCommand(message as CommandMessage);
      } else if (message.FQN.indexOf(dataMessageFQN) === 0) {
        this.handleIncomingCommandReply(message as DataMessage);
      } else {
        this.#deps.logger.emit(new InvalidMessage({ context: message }));
      }
    }
  }

  // tighten return type
  public sendCommand(command: CommandMessage) {
    let peer = this.#replies.get(command.destination.peerId.id);
    if (!peer) {
      peer = new Map();
      this.#replies.set(command.destination.peerId.id, peer);
    }

    let host = peer.get(command.destination.host);
    if (!host) {
      host = new Map();
      peer.set(command.destination.host, host);
    }

    let reply = host.get(command.id);
    if (reply) {
      // throw command id already exists
      // handle this case better
      // actually, we could reply to the calling service with the error
      throw new Error("Command id already exists");
    }

    const deferredCtor = CoreNamingService.getCommandConfig(
      command.payload.serviceFQN,
      command.payload.command,
    )!.returnCtor as DeferredReplyConstructor;

    reply = { promise: undefined, resolve: undefined, validResult: deferredCtor };
    reply.promise = new deferredCtor(() => {
      const result = new Promise<ValueObject>((resolve) => {
        reply!.resolve = resolve;
      });

      host?.delete(command.id);
      if (host?.size === 1) {
        peer?.delete(command.destination.host);
        if (peer?.size === 1) {
          this.#replies.delete(command.destination.peerId.id);
        }
      }

      return result;
    });

    host.set(command.id, reply);
    return this.#deps.networking.send(command).then(() => reply!.promise);
  }

  protected async handleIncomingCommandReply(data: DataMessage) {
    const reply = this.#replies
      ?.get(data.origin.peerId.id)
      ?.get(data.origin.host)
      ?.get(data.id);

    if (reply === undefined) {
      this.#deps.logger.emit(new UnknownCommId({ context: data }));
      return;
    }

    if (!reply.validResult.isValid(data.payload)) {
      this.#deps.logger.emit(new InvalidData({ expectedFQN: reply.validResult.success.FQN, context: data }));
      return;
    }

    reply.resolve!(data.payload)
  }

  protected async handleIncomingCommand(cmd: CommandMessage) {
    const { payload, origin, destination, id } = cmd;
    const { serviceFQN, command, param } = payload;
    // Naming service should be injectable (?)
    const commandConfig = CoreNamingService.getCommandConfig(serviceFQN, command);

    let responseCtor = commandConfig?.dataMsgCtor as Compute<
      DataMessageConstructor &
      Constructor<DataMessage, [{ [key: string]: unknown, payload: ValueObject }]>
    >;


    let error: ErrorObject | undefined;
    if (commandConfig === undefined) {
      error = new UnknownCommand({ context: cmd });
      // @ts-expect-error UnknownCommandMessage should be of same shape of DataMessage
      responseCtor = UnknownCommandMessage;
    } else if (!this.isExposed(serviceFQN, command)) {
      error = new ServiceUnavailable({ context: cmd });
    } else if (commandConfig.paramFQN !== param.FQN) {
      error = new InvalidParameters({ context: cmd, expectedFQN: commandConfig.paramFQN });
    }

    if (error !== undefined) {
      await this.#deps.networking.send(new responseCtor({
        id,
        sequence: 0,
        length: 1,
        end: true,
        origin: destination,
        destination: origin,
        payload: error,
      }));
      return;
    }

    const serviceToken = CoreNamingService.getServiceToken(serviceFQN) as ServiceToken<ExposableService>;
    let service;
    try {
      service = this.#injector.get(serviceToken);
    } catch (e) {
      const err = new ServiceNotInjected({ context: cmd });
      const logId = await this.#deps.logger.emit(err);
      await this.#deps.networking.send(new responseCtor({
        id,
        sequence: 0,
        length: 1,
        end: true,
        origin: destination,
        destination: origin,
        payload: new InternalError({ ref: logId }),
      }));

      return;
    }

    // @ts-expect-error CommandConfig type does not have key signature
    if (typeof service[command] !== "function") {
      const err = new CommandNotFound({ context: cmd });
      const logId = await this.#deps.logger.emit(err);
      await this.#deps.networking.send(new responseCtor({
        id,
        sequence: 0,
        length: 1,
        end: true,
        origin: destination,
        destination: origin,
        payload: new InternalError({ ref: logId }),
      }));

      return;
    }

    try {
      // @ts-expect-error we know the command exists
      const response: ValueObject = await service[command](param);
      // @ts-expect-error commandConfig should already be checked earlier
      const returnFQNs = commandConfig.returnFQNs;

      if (isValueObject(response) && returnFQNs.includes(response.FQN)) {
        await this.#deps.networking.send(new responseCtor({
          id,
          sequence: 0,
          length: 1,
          end: true,
          origin: destination,
          destination: origin,
          payload: response,
        }));
      } else {
        const err = new InvalidReturn({
          context: cmd,
          expectedFQNs: [...returnFQNs],
          actualFQN: response?.FQN,
        });

        const logId = await this.#deps.logger.emit(err);
        await this.#deps.networking.send(new responseCtor({
          id,
          sequence: 0,
          length: 1,
          end: true,
          origin: destination,
          destination: origin,
          payload: new InternalError({ ref: logId }),
        }));
      }
    } catch (e) {
      const err = new UnexpectedError({ error: e, context: cmd });

      const logId = await this.#deps.logger.emit(err);
      await this.#deps.networking.send(new responseCtor({
        id,
        sequence: 0,
        length: 1,
        end: true,
        origin: destination,
        destination: origin,
        payload: new InternalError({ ref: logId }),
      }));
    }
  }
}
