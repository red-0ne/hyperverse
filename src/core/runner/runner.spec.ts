import "reflect-metadata";
import z from "myzod";
import { Injectable, ReflectiveInjector } from "injection-js";
import { valueObjectClassFactory, isValueObject, Register } from "../value-object";
import { StreamBoundary, StreamService } from "../stream";
import { NetworkingService, NetworkingServiceToken } from "../networking";
import { ServiceEventPayload } from "../domain-event";
import { dependencyBundleFactory } from "../di-bundle";
import { Message, commandMessageClassFactory, deferredReplyClassFactory, PeerId, PeerInfo, DataMessage, CommandMessage, dataMessageFQN } from "../messaging";
import { errorObjectClassFactory } from "../errors";
import { LoggerServiceToken, Runner, RunnerDeps } from "./runner";
import { PeerUpdated } from "./events";
import { PeerUpdatesStream, PeerUpdatesStreamToken } from "./service-registry";
import { ServiceToken, exposableServiceFactory } from "./service";
import { Exposable } from "./exposable";
import { positiveIntegerSchema } from "../utils";
import { CoreNamingService } from "./naming-service";
import { CommandNotFound, InternalError, InvalidData, InvalidMessage, InvalidParameters, InvalidReturn, ServiceNotInjected, ServiceUnavailable, UnexpectedError, UnknownCommId } from "./errors";
import { CommandErrors } from "./types";
import { UnknownCommandMessage } from "../messaging/errors";

@Register
class LoggedData extends valueObjectClassFactory(
  "Test::ValueObject::LoggedData",
  z.object({
    data: z.unknown().map(o => {
      if (isValueObject(o)) {
        return o;
      }
      throw new Error("Not a value object");
    }),
  }),
) {}

@Injectable()
class LoggingStream implements StreamService {
  public readonly FQN = "Test::Stream::LoggingStream";
  public readonly ids = [LoggedData];
  public readonly resourceId: string = "";
  public lastData?: InstanceType<typeof LoggedData>;

  readonly #logs: InstanceType<typeof LoggedData>[] = [];
  #newLog: { promise?: Promise<LoggedData>, resolver?: (d: LoggedData) => void }
    = this.generateNextLog({});

  public ready(): Promise<void> {
    return Promise.resolve();
  }

  public emit(data: any): Promise<string> {
    const loggedData = new LoggedData({ data });
    this.#logs.push(loggedData);
    this.lastData = loggedData;
    const resolver = this.#newLog.resolver;
    this.generateNextLog(this.#newLog);
    resolver!(loggedData);
    return Promise.resolve("123");
  }

  public async *stream(args: StreamBoundary): AsyncIterable<LoggedData> {
    let current = args.start;
    while (current <= args.end && current < this.#logs.length) {
      this.lastData = this.#logs[current];
      yield this.lastData!;
      ++current;
    }

    while (true) {
      yield await this.#newLog.promise!;
    }
  }

  protected generateNextLog(data: { promise?: Promise<LoggedData>, resolver?: (d: LoggedData) => void }) {
    data.promise = new Promise((resolve) => {
      data.resolver = resolve;
    });

    return data;
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

const VoidReply = deferredReplyClassFactory(VoidObject, [BufferFull]);
type VoidReply = InstanceType<typeof VoidReply>;

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
  public async print(count: Count): VoidReply {
    const boundary = new StreamBoundary({ start: 0, end: count.v });
    for await (const update of this.#deps.peerUpdates.stream(boundary)) {
      if (this.output.length > 100) {
        return new BufferFull({ max: 100 });
      }
      this.output.push(update);
    }
    return new VoidObject({});
  }

  @Exposable
  public async slowCommand(count: Count): VoidReply {
    await new Promise(r => setTimeout(r, 1000));
    return new VoidObject({});
  }

  @Exposable
  public async badPrint(c: Count): VoidReply {
    if (c.v > 100) {
      throw new Error("Some error");
    }

    // @ts-expect-error we fake a bad return type
    const result: VoidObject = new LoggedData({ data: new VoidObject({}) })

    return result;
  }

  public async unexposedCommand(_: Count): VoidReply {
    return new VoidObject({});
  }
}

@Register
class PrintCommand extends commandMessageClassFactory(Console, "print") {}

@Injectable()
class LoopbackNetworking implements NetworkingService {
  #nextMsgResolver: ((value: Message) => void) | undefined;
  #nextMsgPromise = new Promise<Message>(resolve => this.#nextMsgResolver = resolve);
  public readonly data: Message[] = [];

  send(msg: Message): Promise<void> {
    this.data.push(msg);
    this.next(msg);
    return Promise.resolve();
  }

  async *messages(): AsyncIterable<Message> {
    while (true) yield await this.#nextMsgPromise;
  }

  // used by tests to push an incoming message into the stream
  next(msg: Message): void {
    this.#nextMsgResolver?.(msg);
    this.#nextMsgPromise = new Promise(resolve =>
      this.#nextMsgResolver = resolve
    );
  }

  ready(): Promise<void> {
    return Promise.resolve();
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

async function makeRunner(config?: {
  exposedServices?: string[],
  injectService?: boolean,
}) {
  const runnerDeps = RunnerDeps
    .provide("identity").asValue({
      getPeerInfo: () => new PeerInfo({
        hosts: ["http://localhost"],
        peerId: new PeerId({ id: "ID" }),
      }),
    })
    .provide("exposedServices").asValue({
      "Test::Console::BuiltIn": config?.exposedServices || ["print", "badPrint", "slowCommand"],
    })
    .provide("logger").asClass(LoggingStream)
    .provide("peerUpdates").asClass(PeerUpdates)
    .provide("networking").asClass(LoopbackNetworking)
    .seal();

  const deps: any[] = [ runnerDeps, Runner ];

  if (config?.injectService !== false) {
    const consoleDeps = ConsoleDeps
      .provide("peerUpdates").asClass(PeerUpdates)
      .seal();

    deps.push(consoleDeps, { provide: Console.token, useClass: Console });
  }

  const injector = ReflectiveInjector.resolveAndCreate(deps);
  const runner: Runner = injector.get(Runner);
  const networking: LoopbackNetworking = injector.get(NetworkingServiceToken);
  const logger: LoggingStream = injector.get(LoggerServiceToken);
  const console: Console | undefined = config?.injectService !== false ? injector.get(Console.token) : undefined;

  await runner.ready();

  return { runner, networking, logger, injector, console };
}

describe('Runner', () => {
  it("instantiates a minimal runner", async () => {
    const { runner } = await makeRunner();

    expect(runner).toBeDefined();
    expect(async () => await runner.ready()).not.toThrow();
    expect(await runner.ready()).toBeUndefined();
  });

  it("receives commands from networking service and replies to it", async () => {
    const { runner, injector } = await makeRunner();
    const ready = runner.ready();
    expect(ready).toBeInstanceOf(Promise);
    expect(await ready).toEqual(undefined);

    // TODO: Inject naming service if possible
    const exposed = CoreNamingService.getCommandConfig("Test::Console::BuiltIn", "print");

    expect(exposed).toBeDefined();
    expect(runner.isExposed("Test::Console::BuiltIn", "print")).toBe(true);
    expect(exposed?.paramFQN).toEqual("Test::ValueObject::Count");
    expect(exposed?.returnFQNs.length).toEqual(6);
    expect(exposed?.returnFQNs[0]).toEqual("Test::ValueObject::Void");
    expect(exposed?.returnFQNs[1]).toEqual("Test::ValueObject::Error::BufferFull");

    const console: Console = injector.get(Console.token);
    const consoleReady = console.ready();
    expect(consoleReady).toBeInstanceOf(Promise);
    expect(await ready).toEqual(undefined);

    const networking: LoopbackNetworking = injector.get(NetworkingServiceToken);

    const cmd = new (exposed!.commandMsgCtor as typeof PrintCommand)({
      end: true,
      id: "0",
      length: 1,
      origin: { peerId: new PeerId({ id: "ID2" }), host: "http://remote.localhost"},
      destination: { peerId: new PeerId({ id: "ID" }), host: "http://localhost"},
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

    const promise = runner.sendCommand(cmd);

    expect(promise).toBeInstanceOf(Promise);
    //expect(promise).toBeInstanceOf(VoidReply);

    expect(networking.data.length).toEqual(1);

    expect(isValueObject(networking.data[0])).toBe(true);
    expect(networking.data[0]?.destination).toMatchObject(cmd.destination);
    expect(networking.data[0]?.origin).toMatchObject(cmd.origin);
    expect(networking.data[0]?.FQN).toBe("Core::ValueObject::Message::Command::Test::Console::BuiltIn::print");

    const result = await promise;

    expect(networking.data.length).toEqual(2);
    expect(messagesCount).toEqual(2);

    expect(isValueObject(networking.data[1])).toBe(true);
    expect(networking.data[1]?.destination).toMatchObject(cmd.origin);
    expect(networking.data[1]?.origin).toMatchObject(cmd.destination);
    expect(networking.data[1]?.FQN).toBe("Core::ValueObject::Message::Data::Test::Console::BuiltIn::print");

    expect(result).toBeInstanceOf(VoidObject);

    const op = () => runner.sendCommand(cmd);
    expect(op).toThrow("Command id already exists");
  });

  it("logs and ignores messages with invalid FQN", async () => {
    const { runner, networking, logger } = await makeRunner();

    let logs: LoggedData[] = [];
    (async () => {
      for await (const log of logger.stream(new StreamBoundary({ start: 0, end: Infinity }))) {
        logs.push(log);
      }
    })();

    await runner.ready();
    // @ts-expect-error, we are testing invalid FQN
    await networking.send(new VoidObject({}));
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(logs.length).toEqual(1);
    expect(logs[0]).toBeInstanceOf(LoggedData);
    const data = logs[0]?.data as InvalidMessage;
    expect(data).toBeInstanceOf(InvalidMessage);
    expect(data.context).toBeInstanceOf(VoidObject);
  });

  it("logs and ignores messages with unknown message ids", async() => {
    const { runner, networking, logger } = await makeRunner();

    let logs: LoggedData[] = [];
    (async () => {
      for await (const log of logger.stream(new StreamBoundary({ start: 0, end: Infinity }))) {
        logs.push(log);
      }
    })();

    const exposed = CoreNamingService.getCommandConfig("Test::Console::BuiltIn", "print");
    const cmd = new exposed!.dataMsgCtor({
      end: true,
      id: "BadID",
      length: 1,
      origin: { peerId: new PeerId({ id: "ID2" }), host: "http://remote.localhost"},
      destination: { peerId: new PeerId({ id: "ID" }), host: "http://localhost"},
      sequence: 0,
      payload: new VoidObject({}),
    }) as DataMessage;

    await runner.ready();
    await networking.send(cmd);
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(logs.length).toEqual(1);
    expect(logs[0]).toBeInstanceOf(LoggedData);
    const data = logs[0]?.data as UnknownCommId;
    expect(data).toBeInstanceOf(UnknownCommId);
    expect(data.context).toMatchObject(cmd);
  });

  it("logs and ignores messages with invalid payload at the executor level", async() => {
    const { runner, logger } = await makeRunner();

    let logs: LoggedData[] = [];
    (async () => {
      for await (const log of logger.stream(new StreamBoundary({ start: 0, end: Infinity }))) {
        logs.push(log);
      }
    })();

    const exposed = CoreNamingService.getCommandConfig("Test::Console::BuiltIn", "badPrint");
    const cmd = new exposed!.commandMsgCtor({
      end: true,
      id: "ID",
      length: 1,
      origin: { peerId: new PeerId({ id: "ID2" }), host: "http://remote.localhost"},
      destination: { peerId: new PeerId({ id: "ID" }), host: "http://localhost"},
      sequence: 0,
      payload: {
        serviceFQN: "Test::Console::BuiltIn",
        command: "badPrint",
        param: new Count({ v: 10 }),
      },
    }) as DataMessage;

    await runner.ready();
    await runner.sendCommand(cmd);

    expect(logs.length).toEqual(1);
    expect(logs[0]).toBeInstanceOf(LoggedData);
    const data = logs[0]?.data as InvalidReturn;
    expect(data).toBeInstanceOf(InvalidReturn);
    expect(data.context).toMatchObject(cmd);
    expect(data.expectedFQNs).toMatchObject([
      VoidObject.FQN,
      BufferFull.FQN,
      ...CommandErrors.map(e => e.FQN),
    ]);
    expect(data.actualFQN).toEqual(LoggedData.FQN);
    expect(data.context).toMatchObject(cmd);
  });

  it("logs and ignores messages with invalid payload at the requester level", async() => {
    const { runner, networking, logger } = await makeRunner();

    let logs: LoggedData[] = [];
    (async () => {
      for await (const log of logger.stream(new StreamBoundary({ start: 0, end: Infinity }))) {
        logs.push(log);
      }
    })();

    const exposed = CoreNamingService.getCommandConfig("Test::Console::BuiltIn", "slowCommand");

    const cmd = new (exposed!.commandMsgCtor)({
      end: true,
      id: "0",
      length: 1,
      origin: { peerId: new PeerId({ id: "ID" }), host: "http://localhost"},
      destination: { peerId: new PeerId({ id: "ID2" }), host: "http://remote.localhost"},
      sequence: 0,
      payload: {
        serviceFQN: "Test::Console::BuiltIn",
        command: "slowCommand",
        param: new Count({ v: 10 }),
      },
    }) as CommandMessage;

    await runner.sendCommand(cmd);

    const fakeReply = new exposed!.dataMsgCtor({
      end: true,
      id: "0",
      length: 1,
      origin: { peerId: new PeerId({ id: "ID2" }), host: "http://remote.localhost"},
      destination: { peerId: new PeerId({ id: "ID" }), host: "http://localhost"},
      sequence: 0,
      payload: new VoidObject({}),
    }) as DataMessage;
    // @ts-expect-error this is a hack to get around readonly payload
    fakeReply.__parsedValue__.payload = new LoggedData({ data: new VoidObject({}) });

    await runner.ready();
    await networking.send(fakeReply);
    await new Promise(r => setTimeout(r ,100));

    expect(logs.length).toEqual(1);
    expect(logs[0]).toBeInstanceOf(LoggedData);
    const data = logs[0]?.data as InvalidData;
    expect(data).toBeInstanceOf(InvalidData);
    expect(data.context).toMatchObject(fakeReply);
    expect(data.expectedFQN).toEqual(VoidObject.FQN);
    expect(data.context).toMatchObject(fakeReply);
  });

  it("replies for unknown commands", async() => {
    const { networking } = await makeRunner();
    const exposed = CoreNamingService.getCommandConfig("Test::Console::BuiltIn", "print");
    const cmd = new (exposed!.commandMsgCtor)({
      end: true,
      id: "0",
      length: 1,
      origin: { peerId: new PeerId({ id: "ID" }), host: "http://localhost"},
      destination: { peerId: new PeerId({ id: "ID2" }), host: "http://remote.localhost"},
      sequence: 0,
      payload: {
        serviceFQN: "Test::Console::BuiltIn",
        command: "print",
        param: new Count({ v: 10 }),
      },
    }) as CommandMessage;
    // @ts-expect-error get around readonly payload
    cmd.__parsedValue__.payload.command = "unknownCommand";

    await networking.send(cmd);

    let firstMessage: any
    await (async () => {
      for await (const message of networking.messages()) {
        firstMessage = message;
        break;
      }

    })();

    expect(firstMessage).toBeInstanceOf(UnknownCommandMessage);
    expect(firstMessage?.payload.context).toMatchObject(cmd);
  });

  it("replies for when service is unavailable", async() => {
    const { networking } = await makeRunner({ exposedServices: ["badPrint"] });
    const exposed = CoreNamingService.getCommandConfig("Test::Console::BuiltIn", "print");
    const cmd = new (exposed!.commandMsgCtor)({
      end: true,
      id: "0",
      length: 1,
      origin: { peerId: new PeerId({ id: "ID" }), host: "http://localhost"},
      destination: { peerId: new PeerId({ id: "ID2" }), host: "http://remote.localhost"},
      sequence: 0,
      payload: {
        serviceFQN: "Test::Console::BuiltIn",
        command: "print",
        param: new Count({ v: 10 }),
      },
    }) as CommandMessage;

    await networking.send(cmd);

    let dataMessage: any;
    await (async () => {
      for await (const message of networking.messages()) {
        if (message.FQN.indexOf(dataMessageFQN) === 0) {
          dataMessage = message;
          break;
        }
      }
    })();

    expect(dataMessage.payload).toBeInstanceOf(ServiceUnavailable);
    expect(dataMessage.payload.context).toMatchObject(cmd);
  });

  it("replies for invalid parameters", async() => {
    const { networking } = await makeRunner();
    const exposed = CoreNamingService.getCommandConfig("Test::Console::BuiltIn", "print");
    const cmd = new (exposed!.commandMsgCtor)({
      end: true,
      id: "0",
      length: 1,
      origin: { peerId: new PeerId({ id: "ID" }), host: "http://localhost"},
      destination: { peerId: new PeerId({ id: "ID2" }), host: "http://remote.localhost"},
      sequence: 0,
      payload: {
        serviceFQN: "Test::Console::BuiltIn",
        command: "print",
        param: new Count({ v: 10 }),
      },
    }) as CommandMessage;
    // @ts-expect-error get around readonly payload
    cmd.__parsedValue__.payload.param = new VoidObject({});

    await networking.send(cmd);

    let dataMessage: any;
    await (async () => {
      for await (const message of networking.messages()) {
        if (message.FQN.indexOf(dataMessageFQN) === 0) {
          dataMessage = message;
          break;
        }
      }
    })();

    expect(dataMessage.payload).toBeInstanceOf(InvalidParameters);
    expect(dataMessage.payload?.context).toMatchObject(cmd);
    expect(dataMessage.payload?.expectedFQN).toEqual(Count.FQN);
  });

  it("replies with internal error and logs when service is not injected", async() => {
    const { networking, logger } = await makeRunner({ injectService : false });
    const exposed = CoreNamingService.getCommandConfig("Test::Console::BuiltIn", "print");
    const cmd = new (exposed!.commandMsgCtor)({
      end: true,
      id: "0",
      length: 1,
      origin: { peerId: new PeerId({ id: "ID" }), host: "http://localhost"},
      destination: { peerId: new PeerId({ id: "ID2" }), host: "http://remote.localhost"},
      sequence: 0,
      payload: {
        serviceFQN: "Test::Console::BuiltIn",
        command: "print",
        param: new Count({ v: 10 }),
      },
    }) as CommandMessage;

    let dataMessage: any;
    let logs: any[] = [];
    let logResolver: any;

    await networking.send(cmd);
    const logPromise = new Promise((resolve) => {
      logResolver = resolve;
    });

    (async () => {
      for await (const message of networking.messages()) {
        if (message.FQN.indexOf(dataMessageFQN) === 0) {
          dataMessage = message;
          break;
        }
      }

      for await (const log of logger.stream(new StreamBoundary({ start: 0, end: Infinity }))) {
        logs.push(log);
        logResolver()
      }
    })();

    await logPromise;

    expect(dataMessage.payload).toBeInstanceOf(InternalError);
    expect(dataMessage.payload?.ref).toEqual("123");
    expect(logs.length).toEqual(1);
    expect(logs[0].data).toBeInstanceOf(ServiceNotInjected);
    expect(logs[0].data.context).toMatchObject(cmd);
  });

  it("replies with internal error and logs when command is not executable", async() => {
    const { networking, logger, console } = await makeRunner();
    const exposed = CoreNamingService.getCommandConfig("Test::Console::BuiltIn", "print");
    const cmd = new (exposed!.commandMsgCtor)({
      end: true,
      id: "0",
      length: 1,
      origin: { peerId: new PeerId({ id: "ID" }), host: "http://localhost"},
      destination: { peerId: new PeerId({ id: "ID2" }), host: "http://remote.localhost"},
      sequence: 0,
      payload: {
        serviceFQN: "Test::Console::BuiltIn",
        command: "print",
        param: new Count({ v: 10 }),
      },
    }) as CommandMessage;

    let dataMessage: any;
    let logs: any[] = [];
    let logResolver: any;

    // @ts-expect-error somehow the print command is no longer a function
    console.print = {};

    await networking.send(cmd);
    const logPromise = new Promise((resolve) => {
      logResolver = resolve;
    });

    (async () => {
      for await (const message of networking.messages()) {
        if (message.FQN.indexOf(dataMessageFQN) === 0) {
          dataMessage = message;
          break;
        }
      }

      for await (const log of logger.stream(new StreamBoundary({ start: 0, end: Infinity }))) {
        logs.push(log);
        logResolver()
      }
    })();

    await logPromise;

    expect(dataMessage.payload).toBeInstanceOf(InternalError);
    expect(dataMessage.payload?.ref).toEqual("123");
    expect(logs.length).toEqual(1);
    expect(logs[0].data).toBeInstanceOf(CommandNotFound);
    expect(logs[0].data.context).toMatchObject(cmd);
  });

  it("replies with internal error and logs when command has thrown", async() => {
    const { networking, logger  } = await makeRunner();
    const exposed = CoreNamingService.getCommandConfig("Test::Console::BuiltIn", "badPrint");
    const cmd = new (exposed!.commandMsgCtor)({
      end: true,
      id: "0",
      length: 1,
      origin: { peerId: new PeerId({ id: "ID" }), host: "http://localhost"},
      destination: { peerId: new PeerId({ id: "ID2" }), host: "http://remote.localhost"},
      sequence: 0,
      payload: {
        serviceFQN: "Test::Console::BuiltIn",
        command: "badPrint",
        param: new Count({ v: 1000 }),
      },
    }) as CommandMessage;

    let dataMessage: any;
    let logs: any[] = [];
    let logResolver: any;

    await networking.send(cmd);
    const logPromise = new Promise((resolve) => {
      logResolver = resolve;
    });

    (async () => {
      for await (const message of networking.messages()) {
        if (message.FQN.indexOf(dataMessageFQN) === 0) {
          dataMessage = message;
          break;
        }
      }

      for await (const log of logger.stream(new StreamBoundary({ start: 0, end: Infinity }))) {
        logs.push(log);
        logResolver()
      }
    })();

    await logPromise;

    expect(dataMessage.payload).toBeInstanceOf(InternalError);
    expect(dataMessage.payload?.ref).toEqual("123");
    expect(logs.length).toEqual(1);
    expect(logs[0].data).toBeInstanceOf(UnexpectedError);
    expect(logs[0].data.context).toMatchObject(cmd);
    expect(logs[0].data.error).toBeInstanceOf(Error);
    expect(logs[0].data.error.message).toEqual("Some error");
    expect(logs[0].data.error.stack).toBeDefined();
  });
});

describe("NamingService", () => {
  it("fails registering a command twice", () => {
    const deps = RunnerDeps
    class Svc1 extends exposableServiceFactory("Test::SomeService::Svc1") {
      @Exposable
      public someMethod(): VoidReply {
        return new VoidReply(async () => new VoidObject({}));
      }
    }

    expect(() => {
      class Svc2 extends exposableServiceFactory("Test::SomeService::Svc1") {
        @Exposable
        public someOtherMethod(): VoidReply {
          return new VoidReply(async () => new VoidObject({}));
        }
      }
    }).toThrowError("Service already registered");

    expect(() => {
      const method1: string = "someMethod";
      const method2: string = "someMethod";
      class Svc3 extends exposableServiceFactory("Test::SomeService::Svc3") {
        @Exposable
        public [method1](): VoidReply {
          return new VoidReply(async () => new VoidObject({}));
        }

        @Exposable
        public [method2](): VoidReply {
          return new VoidReply(async () => new VoidObject({}));
        }
      }
    }).toThrowError("Command already registered");
  });

  it("fails to register a value object twice", () => {
    expect(() => {
      CoreNamingService.registerValueObject(Count);
    }).toThrowError("Already registered");
  });
});