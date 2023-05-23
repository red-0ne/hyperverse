import "reflect-metadata";
import z from "myzod";
import { Injectable, ReflectiveInjector } from "injection-js";
import { valueObjectClassFactory, isValueObject, Register } from "../value-object";
import { StreamBoundary, StreamService } from "../stream";
import { NetworkingService, NetworkingServiceToken } from "../networking";
import { ServiceEventPayload } from "../domain-event";
import { dependencyBundleFactory } from "../di-bundle";
import { Message, commandMessageClassFactory, deferredReplyClassFactory, PeerId, PeerInfo } from "../messaging";
import { errorObjectClassFactory } from "../errors";
import { Runner, RunnerDeps } from "./runner";
import { PeerUpdated } from "./events";
import { PeerUpdatesStream, PeerUpdatesStreamToken } from "./service-registry";
import { ServiceToken, exposableServiceFactory } from "./service";
import { Exposable } from "./exposable";
import { positiveIntegerSchema } from "../utils";
import { CoreNamingService } from "./naming-service";

@Register
class LoggedData extends valueObjectClassFactory(
  "Test::ValueObject::LoggedData",
  z.object({})
    .allowUnknownKeys()
    .withPredicate(o => isValueObject(o)),
) {}

@Injectable()
class LoggingStream implements StreamService {
  public readonly FQN = "Test::Stream::LoggingStream";
  public readonly ids = [LoggedData];
  public readonly resourceId: string = "";
  public lastData?: InstanceType<typeof LoggedData>;

  readonly #logs: InstanceType<typeof LoggedData>[] = [];

  public ready(): Promise<void> {
    return Promise.resolve();
  }

  public emit(data: LoggedData): Promise<void> {
    this.#logs.push(data);
    this.lastData = data;
    return Promise.resolve();
  }

  public async *stream(args: StreamBoundary): AsyncIterable<LoggedData> {
    let current = args.start;
    while (current <= args.end) {
      const lastData = this.#logs[current];
      if (lastData === undefined) {
        throw Error("should not happen")
      }

      this.lastData = lastData;
      yield lastData;
      ++current;
    }
  }
}

@Register
class VoidObject extends valueObjectClassFactory(
  "Test::ValueObject::Void",
  z.object({}),
) {}

@Register
class BufferFull extends errorObjectClassFactory(
  "Test::ValueObject::Error::BufferFull",
  z.object({}),
) {}

class VoidReply extends deferredReplyClassFactory(VoidObject, [BufferFull]) {}

@Register
class Count extends valueObjectClassFactory(
  "Test::ValueObject::Count",
  z.object({ v: positiveIntegerSchema }),
) {}

class ConsoleDeps extends dependencyBundleFactory({
  peerUpdates: PeerUpdatesStreamToken,
} as const) {}

@Injectable()
class Console extends exposableServiceFactory(
  "Test::Console::BuiltIn",
  ConsoleDeps,
  new ServiceToken("Test::Console::BuiltIn"),
) {
  #deps: ConsoleDeps;
  public output: string[] = [];

  constructor(deps: ConsoleDeps) {
    super();
    this.#deps = deps;
  }

  @Exposable
  public print(count: Count): VoidReply {
    return new VoidReply(async (resolve) => {
      const boundary = new StreamBoundary({ start: 0, end: count.v });
      for await (const update of this.#deps.peerUpdates.stream(boundary)) {
        if (this.output.length > 100) {
          return resolve(new BufferFull({ max: 100 }));
        }
        this.output.push(update);
      }
      return resolve(new VoidObject({}));
    });
  }

  public unexposedCommand(_: Count): VoidReply {
    return new VoidReply(async (resolve) => {
      return resolve(new VoidObject({}));
    });
  }
}

@Register
class PrintCommand extends commandMessageClassFactory(Console, "print") {}

@Injectable()
class DummyNetworking implements NetworkingService {
  #nextMsgResolver!: (value: Message) => void;
  #nextMsgPromise = new Promise<Message>(resolve => this.#nextMsgResolver = resolve);
  public readonly responses: Message[] = [];

  send(msg: Message): Promise<void> {
    this.responses.push(msg);
    return Promise.resolve();
  }

  async *messages(): AsyncIterable<Message> {
    while (true) yield await this.#nextMsgPromise;
  }

  // used by tests to push an incoming message into the stream
  next(msg: Message): void {
    this.#nextMsgResolver(msg);
    this.#nextMsgPromise = new Promise(resolve => this.#nextMsgResolver = resolve);
  }
}

@Injectable()
class PeerUpdates implements PeerUpdatesStream {
  public readonly FQN = "Core::Stream::DomainEvent::PeerUpdates";
  public readonly ids = [PeerUpdated];
  public lastData?: InstanceType<([typeof PeerUpdated])[number]>;

  #stream: PeerUpdated[] = [];

  public async emit(eventPayload: ServiceEventPayload<PeerUpdates>): Promise<void> {
    this.#stream.push(new PeerUpdated({
      eventTypeSequence: this.#stream.length,
      topicSequence: this.#stream.length,
      timestamp: new Date().getTime(),
      appVersion: "0.0.0",
      payload: eventPayload.value(),
    }));

    this.lastData = eventPayload;
  }

  public async *stream(args?: StreamBoundary): AsyncIterable<PeerUpdated> {
    let current = args?.start ?? 0;
    const end = args?.end ?? Infinity;
    while (current <= end) {
      if (current >= this.#stream.length) {
        break;
      }

      const lastData = this.#stream[this.#stream.length -1];
      if (lastData === undefined) {
        throw Error("should not happen");
      }
      yield lastData;
      ++current;
    }
  }

  public ready() {
    return Promise.resolve();
  }
}

describe('Runner', () => {
  it("instantiates a minimal runner", async () => {
    const deps = RunnerDeps
      .provide("identity").asValue({
        getPeerInfo: () => new PeerInfo({
          hosts: ["http://localhost"],
          peerId: new PeerId({ id: "ID" }),
        }),
      })
      .provide("exposedServices").asValue({})
      .provide("logger").asClass(LoggingStream)
      .provide("peerUpdates").asClass(PeerUpdates)
      .provide("networking").asClass(DummyNetworking)
      .seal();

    const injector = ReflectiveInjector.resolveAndCreate([deps, Runner]);
    const runner: Runner = injector.get(Runner);

    expect(runner).toBeDefined();
    expect(async () => await runner.ready()).not.toThrow();
    expect(await runner.ready()).toBeUndefined();
  });

  it("receives commands from networking service and replies to it", async () => {
    const runnerDeps = RunnerDeps
      .provide("identity").asValue({
        getPeerInfo: () => new PeerInfo({
          hosts: ["http://localhost"],
          peerId: new PeerId({ id: "ID" }),
        }),
      })
      .provide("exposedServices").asValue({
        "Test::Console::BuiltIn": ["print"],
      })
      .provide("logger").asClass(LoggingStream)
      .provide("peerUpdates").asClass(PeerUpdates)
      .provide("networking").asClass(DummyNetworking)
      .seal();

    const consoleDeps = ConsoleDeps
      .provide("peerUpdates").asClass(PeerUpdates)
      .seal();

    const injector = ReflectiveInjector.resolveAndCreate([
      consoleDeps,
      { provide: Console.token, useClass: Console },
      runnerDeps,
      Runner,
    ]);
    const runner: Runner = injector.get(Runner);
    const ready = runner.ready();
    expect(ready).toBeInstanceOf(Promise);
    expect(await ready).toEqual(undefined);

    // TODO: Inject naming service if possible
    const exposed = CoreNamingService.getCommandConfig("Test::Console::BuiltIn", "print");

    expect(exposed).toBeDefined();
    expect(exposed?.exposed).toBe(true);
    expect(exposed?.paramFQN).toEqual("Test::ValueObject::Count");
    expect(exposed?.returnFQNs.length).toEqual(6);
    expect(exposed?.returnFQNs[0]).toEqual("Test::ValueObject::Void");
    expect(exposed?.returnFQNs[1]).toEqual("Test::ValueObject::Error::BufferFull");

    const console: Console = injector.get(Console.token);
    const consoleReady = console.ready();
    expect(consoleReady).toBeInstanceOf(Promise);
    expect(await ready).toEqual(undefined);

    const networking: DummyNetworking = injector.get(NetworkingServiceToken);

    const origin = new PeerInfo({ peerId: new PeerId({ id: "ID2" }), hosts: ["http://remote.localhost"] });
    const cmd = new PrintCommand({
      end: true,
      id: "0",
      length: 1,
      origin,
      sequence: 0,
      payload: {
        serviceFQN: "Test::Console::BuiltIn",
        command: "print",
        param: new Count({ v: 10 }),
      },
    });

    // iterate over the network messages stream
    let messagesCount: number | null = null;
    (async () => {
      messagesCount = 0;
      for await (const _ of networking.messages()) {
        messagesCount++;
      }
    })();

    expect(messagesCount).toEqual(0);

    networking.next(cmd);
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(networking.responses.length).toEqual(1);
    expect(isValueObject(networking.responses[0])).toBe(true);
    expect(messagesCount).toEqual(1);

    expect(networking.responses[0]?.FQN).toBe("Core::ValueObject::Message::Data::Test::Console::BuiltIn::print");

    networking.next(cmd);
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(messagesCount).toEqual(2);
  });

  it("handle incoming data from network", async () => {
  });

  it("logs and ignores invalid incoming messages", async () => {
  });

  it("logs and ignores invalid data streams", async () => {
  });

  it("logs and ignores data not belonging to a stream definition", async () => {
  });

  it("closes and cleans an ended stream", async () => {
  });
});

describe("NamingService", () => {
  it("fails registering a command twice", () => {
    const deps = RunnerDeps
    class Svc1 extends exposableServiceFactory("Test::SomeService::Svc1") {
      @Exposable
      public someMethod(): VoidReply {
        return new VoidReply(resolve => resolve(new VoidObject({})));
      }
    }

    expect(() => {
      class Svc2 extends exposableServiceFactory("Test::SomeService::Svc1") {
        @Exposable
        public someOtherMethod(): VoidReply {
          return new VoidReply(resolve => resolve(new VoidObject({})));
        }
      }
    }).toThrowError("Service already registered");

    expect(() => {
      const method1: string = "someMethod";
      const method2: string = "someMethod";
      class Svc3 extends exposableServiceFactory("Test::SomeService::Svc3") {
        @Exposable
        public [method1](): VoidReply {
          return new VoidReply(resolve => resolve(new VoidObject({})));
        }

        @Exposable
        public [method2](): VoidReply {
          return new VoidReply(resolve => resolve(new VoidObject({})));
        }
      }
    }).toThrowError("Command already registered");
  });

  it("fails to expose a command for an unrecognized service or command", () => {
    expect(() => {
      CoreNamingService.exposeCommand("Text::SomeService::Svc0", "someCommand");
    }).toThrowError("Service not registered");

    expect(() => {
      CoreNamingService.exposeCommand("Test::Console::BuiltIn", "unexposedCommand");
    }).toThrowError("Command not registered");
  });

  it("fails to register a value object twice", () => {
    expect(() => {
      CoreNamingService.registerValueObject(Count);
    }).toThrowError("Already registered");
  });
});