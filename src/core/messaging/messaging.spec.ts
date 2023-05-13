import "reflect-metadata";
import z from "myzod";
import { dependencyBundleFactory } from "../di-bundle";
import { errorObjectClassFactory } from "../errors";
import { ExposableService, ServiceToken } from "../runner/service";
import { ValueObject, valueObjectClassFactory } from "../value-object";
import { Register } from "../value-object/register";
import { CommandMessage, CommandMessageConstructor, commandMessageClassFactory, commandMessageFQN } from "./command";
import { DeferredReply, deferredReplyClassFactory } from "./deferred";
import { DependencyBundleTokenMap } from "../di-bundle/types";
import { PeerId, PeerInfo } from "../runner/types";
import { isValueObject } from "../value-object/value-object-factory";
import { Exposable } from "../runner/exposable";
import { expectType } from "ts-expect";

describe.only("Messaging", () => {
  class UnregisteredArg {
    static FQN = "Test::ValueObject::UnregisteredArg";
    FQN = "Test::ValueObject::UnregisteredArg";

    public readonly foo = false;
  }

  @Register
  class Arg extends valueObjectClassFactory(
    "Test::ValueObject::Arg",
    z.object({ foo: z.string() }),
  ) {}

  @Register
  class Result extends valueObjectClassFactory(
    "Test::ValueObject::Result",
    z.object({ r: z.boolean() }),
  ) {}

  @Register
  class Err1 extends errorObjectClassFactory(
    "Test::ValueObject::Error::Err1",
    z.object({ reason: z.literals("a", "b") }),
  ) {}

  @Register
  class Err2 extends errorObjectClassFactory(
    "Test::ValueObject::Error::Err2",
    z.object({ reason: z.number() }),
  ) {}

  class TheReply extends deferredReplyClassFactory(Result, [Err1, Err2] as const) {}

  class Service implements ExposableService {
    readonly ready = Promise.resolve();
    readonly FQN = `Test::X::Y`;

    static readonly FQN = `Test::X::Y`;
    static readonly deps = dependencyBundleFactory({} as DependencyBundleTokenMap);
    static readonly token = new ServiceToken(Service["FQN"]);

    @Exposable
    theCommand(x: Arg): TheReply {
      return new TheReply((resolve) => resolve(new Result({ r: x.foo === "bar" })));
    }

    @Exposable
    commandWithUnregisteredArg(x: UnregisteredArg): TheReply {
      return new TheReply((resolve) => resolve(new Result({ r: x.foo === false })));
    }

    @Exposable
    simpleFn(x: string): TheReply {
      return new TheReply((resolve) => resolve(new Result({ r: true })));
    }

    foo(x: Arg): string {
      return x.foo;
    }
  }

  it("can create a command message", () => {
    class CommandMsg extends commandMessageClassFactory(Service, "theCommand") {}

    const cmd = new CommandMsg({
      id: "123",
      sequence: 1,
      length: 1,
      end: true,
      origin: new PeerInfo({
        hosts: ["x://y"],
        peerId: new PeerId({ id: "123" }),
      }),
      payload: {
        serviceFQN: Service.FQN,
        command: "theCommand",
        param: new Arg({ foo: "bar" }),
      },
    });

    expect(CommandMsg.FQN).toEqual(`${commandMessageFQN}Test::X::Y::theCommand`);

    expectType<CommandMsg>(cmd);
    expectType<CommandMessage>(cmd);
    expectType<Service["FQN"]>(cmd.payload.serviceFQN);
    expectType<"theCommand">(cmd.payload.command);
    expectType<Arg>(cmd.payload.param);
    expectType<string>(cmd.payload.param.foo);
    expectType<PeerInfo>(cmd.origin);
    expectType<ValueObject>(cmd.origin);
    expectType<PeerId>(cmd.origin.peerId);
    expectType<ValueObject>(cmd.origin.peerId);

    expect(isValueObject(cmd)).toEqual(true);
    expect(cmd).toBeInstanceOf(CommandMsg);
    expect(cmd.FQN).toEqual(CommandMsg.FQN);

    expect(cmd.payload.command).toEqual("theCommand");
    expect(cmd.FQN).toEqual(`${commandMessageFQN}Test::X::Y::theCommand`);
    expect(cmd.payload.serviceFQN).toEqual("Test::X::Y");

    expect(isValueObject(cmd.payload.param)).toEqual(true);
    expect(cmd.payload.param).toBeInstanceOf(Arg);
    expect(cmd.payload.param.FQN).toEqual("Test::ValueObject::Arg");
    expect(cmd.payload.param.foo).toEqual("bar");

    expect(isValueObject(cmd.origin)).toEqual(true);
    expect(cmd.origin).toBeInstanceOf(PeerInfo);
    expect(cmd.origin.FQN).toEqual("Core::ValueObject::PeerInfo");
    expect(cmd.origin.hosts).toMatchObject(["x://y"]);

    expect(isValueObject(cmd.origin.peerId)).toEqual(true);
    expect(cmd.origin.peerId).toBeInstanceOf(PeerId);
    expect(cmd.origin.peerId.FQN).toEqual("Core::ValueObject::PeerId");
    expect(cmd.origin.peerId.id).toEqual("123");
  });

  it("fails to create a command class if arg is not registered", () => {
    expect(() => {
      class CommandMsg extends commandMessageClassFactory(Service, "nonexistingCommand" as any) {}
    }).toThrowError(`Service ${Service.FQN} does not have a command named nonexistingCommand`);
  });

  it("fails to create a command class command does not use a valueObject as arg", () => {
    expect(() => {
      class CommandMsg extends commandMessageClassFactory(Service, "commandWithUnregisteredArg" as any) {}
    }).toThrowError(`Service ${Service.FQN} does not have a command named commandWithUnregisteredArg`);
  });

  it("can receive a reply with a successful result", async () => {
    const service = new Service();
    const replyPromise = service.theCommand(new Arg({ foo: "bar" }));

    expect(replyPromise).toBeInstanceOf(Promise);
    expect(replyPromise).toBeInstanceOf(TheReply);
    expect(replyPromise.success).toEqual(Result);
    expect(replyPromise.failures.length).toEqual(2);
    expect(replyPromise.failures).toMatchObject([Err1, Err2]);

    expectType<Promise<Result | Err1 | Err2>>(replyPromise);
    expectType<DeferredReply>(replyPromise);
    expectType<TheReply>(replyPromise);

    expectType<typeof Result>(replyPromise.success);
    expectType<Readonly<[typeof Err1, typeof Err2]>>(replyPromise.failures);

    const reply = await replyPromise;

    expect(reply).toBeInstanceOf(Result);
    expect(isValueObject(reply)).toEqual(true);
    expect(reply.FQN).toEqual("Test::ValueObject::Result");

    if (reply instanceof Result) {
      expect(reply.r).toEqual(true);
      expectType<Result>(reply);
      expectType<ValueObject>(reply);
      expectType<boolean>(reply.r);
    } else {
      // if we get here, the test should fail
      expect(true).toEqual(false);
    }
  });
});
