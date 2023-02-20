import z, { Type, MappedType, Infer } from "myzod";
import { expectType } from "ts-expect";
import { CoreNamingService } from "../runner/naming-service";
import { StreamBoundary } from "../stream/stream-service";
import { ValueObject } from "../value-object/types";
import { domainEventClassFactory } from "./domain-event";
import { DomainEventStreamService } from "./domain-event-stream";
import { EventPayload } from "./types";

describe("Domain events", () => {
  class Ev1 extends domainEventClassFactory("Test::ValueObject::DomainEvent::E1", z.object({ val: z.string() })) {}
  class Ev2 extends domainEventClassFactory("Test::ValueObject::DomainEvent::E2", z.object({ val: z.number() })) {}
  class Ev3 extends domainEventClassFactory("Test::ValueObject::DomainEvent::E3", z.object({ val: z.literals("a", "b") })) {}

  const streamEvents = [Ev1, Ev2, Ev3] as const;

  let strVal: string;
  let litVal: "a" | "b";
  let numVal: number;
  let topicSequence: number;
  let eventSequence: [number, number, number];
  let sequence: (0 | 1 | 2)[];
  let eventStream: InstanceType<(typeof streamEvents)[number]>[] = [];

  beforeEach(() => {
    strVal = ".";
    litVal = "a";
    numVal = 0;
    topicSequence = 0;
    eventSequence = [0, 0, 0];
    sequence = [];
    eventStream = [];
  });
  class Stream1 implements DomainEventStreamService {
    public readonly FQN = "Test::Stream::DomainEvent::Stream1";
    public readonly ids = streamEvents;
    public lastEvent?: InstanceType<(typeof streamEvents)[number]>;

    public async emit(payload: EventPayload<Stream1>): Promise<void> {
      const index = this.ids.findIndex(ctor => ctor.FQN + "::Payload" === payload.FQN);
      const ctor = this.ids[index];
      if (ctor === undefined) {
        throw new Error("Cannot find event constructor for this payload");
      }

      eventStream.push(
        new ctor({
          eventTypeSequence: eventSequence[index] as number,
          topicSequence: topicSequence,
          timestamp: new Date().getTime(),
          appVersion: "0.0.0",
          payload: payload.toJSON().value as never,
        }),
      );

      // @ts-expect-error index is already checked
      sequence.push(index);
      eventSequence[index]++;
      topicSequence++;
    }

    public async *stream(args: StreamBoundary): AsyncIterable<InstanceType<Stream1["ids"][number]>> {
      let current = args.start;
      while (current <= args.end) {
        if (current >= eventStream.length) {
          break;
        }

        const lastEvent = eventStream[current % eventStream.length];
        if (lastEvent === undefined) {
          throw Error("should not happen");
        }
        this.lastEvent = lastEvent;
        yield await lastEvent;
        const index = this.ids.findIndex(E => E.FQN === lastEvent.FQN);
        ++topicSequence;
        ++eventSequence[index];
        ++current;
      }
    }

    public ready() {
      return Promise.resolve();
    }
  }

  test("DomainEvent typing", async () => {
    const schema = z.object({ foo: z.string(), bar: z.number() });
    class Ev extends domainEventClassFactory("Test::ValueObject::DomainEvent::Ex", schema) {}

    type EvExpectedType = Type<{
      eventTypeSequence: number;
      topicSequence: number;
      timestamp: number;
      payload: Infer<typeof schema>;
      appVersion: string;
    }>;

    Ev.schema();
    Ev.validator().shape().payload;

    expectType<"Test::ValueObject::DomainEvent::Ex">(Ev.FQN);
    expectType<MappedType<ValueObject<"Test::ValueObject::DomainEvent::Ex", Infer<EvExpectedType>>>>(Ev.schema());
    expectType<EvExpectedType>(Ev.validator());

    const e = new Ev({
      eventTypeSequence: 0,
      topicSequence: 0,
      timestamp: new Date().getTime(),
      payload: { foo: "suu", bar: 12 },
      appVersion: "0.0.0",
    });

    expectType<ValueObject<"Test::ValueObject::DomainEvent::Ex", EvExpectedType>["FQN"]>(e.FQN);
    expectType<number>(e.eventTypeSequence);
    expectType<number>(e.topicSequence);
    expectType<number>(e.timestamp);
    expectType<Infer<typeof schema>>(e.payload);
    expectType<("eventTypeSequence" | "topicSequence" | "timestamp" | "payload" | "appVersion")[]>(e.properties());
    expectType<
      () => {
        [CoreNamingService.fqnKey]: "Test::ValueObject::DomainEvent::Ex";
        value: Infer<EvExpectedType>;
      }
    >(e.toJSON);

    expect(Ev.FQN).toEqual("Test::ValueObject::DomainEvent::Ex");
    expect(e.payload).toEqual({ foo: "suu", bar: 12 });
  });

  test("iterates over events", async () => {
    sequence = [0, 1, 0, 0, 1, 2, 1, 1, 1, 2, 2, 2];
    eventStream = sequence.map(v => {
      const baseValue = {
        topicSequence,
        eventTypeSequence: eventSequence[v],
        appVersion: "0.0.0",
        timestamp: new Date().getTime(),
      } as const;

      switch (v) {
        case 0:
          return new streamEvents[v]({ ...baseValue, payload: { val: (strVal += ".") } });
        case 1:
          return new streamEvents[v]({ ...baseValue, payload: { val: ++numVal } });
        case 2:
          return new streamEvents[v]({ ...baseValue, payload: { val: (litVal = litVal === "a" ? "b" : "a") } });
      }
    });

    const s1 = new Stream1();

    expectType<Readonly<[typeof Ev1, typeof Ev2, typeof Ev3]>>(s1.ids);
    expectType<"Test::Stream::DomainEvent::Stream1">(s1.FQN);

    expect(s1.FQN).toEqual("Test::Stream::DomainEvent::Stream1");
    expect(s1.lastEvent).toEqual(undefined);
    expect(s1.ids.length).toEqual(3);

    for await (const e of s1.stream(new StreamBoundary({ start: 0, end: 9 }))) {
      expectType<number>(e.eventTypeSequence);
      expectType<number>(e.topicSequence);
      expectType<number>(e.timestamp);

      switch (e.FQN) {
        case "Test::ValueObject::DomainEvent::E1":
          expectType<string>(e.payload.val);
          break;
        case "Test::ValueObject::DomainEvent::E2":
          expectType<number>(e.payload.val);
          break;
        case "Test::ValueObject::DomainEvent::E3":
          expectType<"a" | "b">(e.payload.val);
          break;
      }
    }

    expect(topicSequence).toEqual(10);
    expect(eventSequence).toEqual([3, 5, 2]);
  });

  test("produce events", async () => {
    const s1 = new Stream1();

    const requests = [Ev1.from({ val: "x" }), Ev2.from({ val: 2 }), Ev3.from({ val: "b" })] as const;

    await s1.emit(requests[0]);
    await s1.emit(requests[1]);
    await s1.emit(requests[2]);

    expect(sequence.length).toEqual(3);

    let i = 0;
    for await (const e of s1.stream(new StreamBoundary({ start: 0, end: Infinity }))) {
      const req = requests[i];
      if (req === undefined) {
        throw new Error("should not happen");
      }
      expect(e.FQN + "::Payload").toEqual(req.FQN);
      expect(e.payload).toEqual(req.toJSON().value);
      expect(e.topicSequence).toEqual(i);
      expect(e.eventTypeSequence).toEqual(0);
      expect(e.timestamp).toBeGreaterThan(0);
      i++;
    }
  });
});
