import "reflect-metadata";
import z from "myzod";
import { expectType } from "ts-expect";
import { dependencyBundleFactory } from "../di-bundle";
import { ValueObject, valueObjectClassFactory, Register, isValueObject } from "../value-object";
import { ErrorObject, errorObjectClassFactory } from "../errors";
import { ServiceToken, exposableServiceFactory, CommandErrors, Exposable } from "../runner";
import { dataMessageClassFactory } from "./data";
import { CommandMessage, commandMessageClassFactory } from "./command";
import { DeferredReply, deferredReplyClassFactory } from "./deferred";
import { PeerId } from "./peer";
import { Message } from "./message";

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

  class Service extends exposableServiceFactory(
    "Test::X::Y",
    dependencyBundleFactory({}),
    new ServiceToken("Test::X::Y")
  ) {
    @Exposable
    theCommand(x: Arg): TheReply {
      return new TheReply(async () => {
        await new Promise((r) => setTimeout(r, 100));
        if (x.foo !== "bob") return new Result({ r: true });
        else return new Err1({ reason: "a" });
      });
    }

    @Exposable
    commandWithUnregisteredArg(x: UnregisteredArg): TheReply {
      return new TheReply(async () => new Result({ r: x.foo === false }));
    }

    @Exposable
    simpleFn(x: string): TheReply {
      return new TheReply(async () => new Result({ r: x === "bar" }));
    }

    @Exposable
    foo(x: Arg): string {
      return x.foo;
    }

    bar(x: Arg): TheReply {
      return new TheReply(async () => new Result({ r: x.foo === "bar" }));
    }
  }

  it("can create a command message", () => {
    class CommandMsg extends commandMessageClassFactory(Service, "theCommand") {}

    const cmd = new CommandMsg({
      id: "123",
      sequence: 0,
      length: 1,
      end: true,
      origin: {
        host: "x://y",
        peerId: new PeerId({ id: "123" }),
      },
      destination: {
        host: "x://z",
        peerId: new PeerId({ id: "321" }),
      },
      payload: {
        serviceFQN: Service.FQN,
        command: "theCommand",
        param: new Arg({ foo: "bar" }),
      },
    });

    expect(CommandMsg.FQN).toEqual(`Core::ValueObject::Message::Command::Test::X::Y::theCommand`);

    expectType<CommandMsg>(cmd);
    expectType<CommandMessage>(cmd);
    expectType<Service["FQN"]>(cmd.payload.serviceFQN);
    expectType<"theCommand">(cmd.payload.command);
    expectType<Arg>(cmd.payload.param);
    expectType<string>(cmd.payload.param.foo);
    expectType<Message["origin"]>(cmd.origin);
    expectType<PeerId>(cmd.origin.peerId);
    expectType<string>(cmd.origin.host);
    expectType<PeerId>(cmd.origin.peerId);
    expectType<ValueObject>(cmd.origin.peerId);

    expect(isValueObject(cmd)).toEqual(true);
    expect(cmd).toBeInstanceOf(CommandMsg);
    expect(cmd.FQN).toEqual(CommandMsg.FQN);

    expect(cmd.payload.command).toEqual("theCommand");
    expect(cmd.FQN).toEqual(`Core::ValueObject::Message::Command::Test::X::Y::theCommand`);
    expect(cmd.payload.serviceFQN).toEqual("Test::X::Y");

    expect(isValueObject(cmd.payload.param)).toEqual(true);
    expect(cmd.payload.param).toBeInstanceOf(Arg);
    expect(cmd.payload.param.FQN).toEqual("Test::ValueObject::Arg");
    expect(cmd.payload.param.foo).toEqual("bar");

    expect(cmd.origin.peerId).toBeInstanceOf(PeerId);
    expect(cmd.origin.host).toBe("x://y");

    expect(isValueObject(cmd.origin.peerId)).toEqual(true);
    expect(cmd.origin.peerId).toBeInstanceOf(PeerId);
    expect(cmd.origin.peerId.FQN).toEqual("Core::ValueObject::PeerId");
    expect(cmd.origin.peerId.id).toEqual("123");
  });

  it("fails to create a command class if command does not exist", () => {
    expect(() => {
      class CommandMsg extends commandMessageClassFactory(Service, "nonexistingCommand" as any) {}
    }).toThrowError(`Service ${Service.FQN} does not have a command named nonexistingCommand`);
  });

  it("fails to create a command class if it does not use a valueObject as arg", () => {
    expect(() => {
      class CommandMsg extends commandMessageClassFactory(Service, "commandWithUnregisteredArg" as any) {}
    }).toThrowError(`Service ${Service.FQN} does not have a command named commandWithUnregisteredArg`);
  });

  it("can receive a reply with a successful result", async () => {
    const service = new Service();
    const replyPromise = service.theCommand(new Arg({ foo: "bar" }));

    expect(replyPromise).toBeInstanceOf(Promise);
    //expect(replyPromise).toBeInstanceOf(TheReply);
    //expect(replyPromise.success).toEqual(Result);
    //expect(replyPromise.failures.length).toEqual(6);
    //expect(replyPromise.failures).toMatchObject([Err1, Err2, ...CommandErrors]);

    expectType<Promise<Result | Err1 | Err2 | InstanceType<typeof CommandErrors[number]>>>(replyPromise);
    expectType<DeferredReply<typeof Result, Readonly<[typeof Err1, typeof Err2]>>>(replyPromise);
    expectType<TheReply>(replyPromise);

    //expectType<typeof Result>(replyPromise.success);
    //expectType<Readonly<[typeof Err1, typeof Err2, ...typeof CommandErrors]>>(replyPromise.failures);

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

  it("can receive a reply with a failed result", async () => {
    const service = new Service();
    const reply = await service.theCommand(new Arg({ foo: "bob" }));

    expect(reply).toBeInstanceOf(Err1);
    expect(reply).toBeInstanceOf(Error);
    expect(isValueObject(reply)).toEqual(true);
    expect(reply.FQN).toEqual("Test::ValueObject::Error::Err1");

    if (reply instanceof Err1) {
      expectType<"a" | "b">(reply.reason);
      expectType<Err1>(reply);
      expectType<Error>(reply);
      expectType<ValueObject>(reply);
      expectType<ErrorObject>(reply);
      expect(reply.reason).toEqual("a");
      expect(reply?.stack).not.toEqual(undefined);
    } else {
      // if we get here, the test should fail
      expect(true).toEqual(false);
    }
  });

  it("can create a reply message for a service command", () => {
    class DataMsg extends dataMessageClassFactory(Service, "theCommand") {}

    const dataMsg = new DataMsg({
      id: "123",
      sequence: 0,
      length: 1,
      end: true,
      origin: {
        host: "x://y",
        peerId: new PeerId({ id: "123" }),
      },
      destination: {
        host: "x://z",
        peerId: new PeerId({ id: "321" }),
      },
      payload: new Result({ r: true }),
    });

    const errorMsg = new DataMsg({
      id: "123",
      sequence: 0,
      length: 1,
      end: true,
      origin: {
        host: "x://y",
        peerId: new PeerId({ id: "123" }),
      },
      destination: {
        host: "x://z",
        peerId: new PeerId({ id: "321" }),
      },
      payload: new Err2({ reason: 11 }),
    });

    expect(DataMsg.FQN).toEqual(`Core::ValueObject::Message::Data::Test::X::Y::theCommand`);

    expectType<DataMsg>(dataMsg);
    expectType<ValueObject>(dataMsg);
    expectType<ValueObject>(dataMsg.payload);
    expectType<Result | Err1 | Err2 | InstanceType<typeof CommandErrors[number]>>(dataMsg.payload);

    expectType<DataMsg>(errorMsg);
    expectType<ValueObject>(errorMsg);
    expectType<ValueObject>(errorMsg.payload);
    expectType<Result | Err1 | Err2 | InstanceType<typeof CommandErrors[number]>>(errorMsg.payload);

    const dataPayload = dataMsg.payload;
    if (dataPayload.constructor === Result) {
      expectType<Result>(dataPayload);
      expectType<boolean>(dataPayload.r);
      expect(dataPayload.r).toEqual(true);
    } else {
      // if we get here, the test should fail
      expect(true).toEqual(false);
    }

    const errorPayload = errorMsg.payload;
    if (errorPayload.constructor === Err2) {
      expectType<Err2>(errorPayload);
      expectType<Error>(errorPayload);
      expectType<number>(errorPayload.reason);
      expect(errorPayload.reason).toEqual(11);
      expect(errorPayload).toBeInstanceOf(Err2);
      expect(errorPayload).toBeInstanceOf(Error);
    } else {
      // if we get here, the test should fail
      expect(true).toEqual(false);
    }
  });

  it("fails to create a data class if command does not exist", () => {
    expect(() => {
      class dataMsg extends dataMessageClassFactory(Service, "nonexistingCommand" as any) {}
    }).toThrowError(`Service ${Service.FQN} does not have a command named nonexistingCommand`);
  });

  it("fails to create a data class if it does not use a valueObject as arg", () => {
    expect(() => {
      class dataMsg extends dataMessageClassFactory(Service, "commandWithUnregisteredArg" as any) {}
    }).toThrowError(`Service ${Service.FQN} does not have a command named commandWithUnregisteredArg`);
  });
});
