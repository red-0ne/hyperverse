import z from "myzod";
import { dependencyBundleFactory } from "../di-bundle";
import { errorObjectClassFactory } from "../errors";
import { ExposableService, ServiceToken } from "../runner/service";
import { valueObjectClassFactory } from "../value-object";
import { Register } from "../value-object/register";
import { commandMessageClassFactory } from "./command";
import { deferredReplyClassFactory } from "./deferred";
import { DependencyBundleTokenMap } from "../di-bundle/types";
import { PeerId, PeerInfo } from "../runner/types";

describe.only("Messaging", () => {
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

  class TheReply extends deferredReplyClassFactory(
    "Test::ValueObject::Reply::TheReply",
    Result,
    [Err1, Err2],
  ) {}

  class Service implements ExposableService {
    readonly ready = Promise.resolve();
    readonly FQN = `Test::X::Y`;

    static readonly FQN = `Test::X::Y`;
    static readonly deps = dependencyBundleFactory({} as DependencyBundleTokenMap);
    static readonly token = new ServiceToken(Service["FQN"]);

    theCommand(x: Arg): TheReply {
      return new TheReply((resolve) => resolve(new Result({ r: x.foo === "bar" })));
    }

    foo(x: Arg): string {
      return x.foo;
    }
  }

  it("can create a command message", () => {
    class TheCommand extends commandMessageClassFactory(Service, "theCommand") {}
    const cmd = new TheCommand({
      id: "123",
      sequence: 1,
      length: 1,
      end: true,
      origin: new PeerInfo({ hosts: [new URL("")], peerId: new PeerId({ id: "123" }) }),
      payload: {
        command: "theCommand",
        param: new Arg({ foo: "bar" }),
        serviceFQN: Service.FQN,
      },
    });

    expect(TheCommand.FQN).toEqual("Test::X::Y::theCommand");
  });
});
