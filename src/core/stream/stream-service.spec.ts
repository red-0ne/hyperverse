import z from "myzod";
import { valueObjectClassFactory } from "../value-object";
import { Register } from "../value-object/register";
import { StreamBoundary, StreamService } from "./stream-service";

describe("Stream service", () => {
  @Register
  class Data1 extends valueObjectClassFactory(
    "Test::ValueObject::Data1",
    z.object({ foo: z.number() }),
  ) {}

  @Register
  class Data2 extends valueObjectClassFactory(
    "Test::ValueObject::Data2",
    z.object({ boo: z.number() })
  ) {}

  class DataStream implements StreamService {
    public readonly FQN = "Test::Stream::DataStream" as const;
    public readonly ids = [Data1, Data2];
    public lastData?: Data1 | Data2;

    constructor(
      public readonly resourceId: string,
      public readonly sequence: (Data1 | Data2)[]
    ) {
    }

    public emit(data: Data1 | Data2): Promise<void> {
      this.sequence.push(data);
      return Promise.resolve();
    }

    public ready(): Promise<void> {
      return Promise.resolve();
    }

    public async *stream(args: StreamBoundary): AsyncIterable<InstanceType<DataStream["ids"][number]>> {
      let current = args.start;
      while (current <= args.end) {
        if (current >= this.sequence.length) {
          break;
        }

        const lastData = this.sequence[current];
        if (lastData === undefined) {
          throw Error("should not happen")
        }

        this.lastData = lastData;
        yield lastData;
        ++current;
      }
    }
  }

  it("should relay a stream", async () => {
    const source = [
      new Data1({ foo: 1 }),
      new Data2({ boo: 2 }),
      new Data1({ foo: 3 }),
      new Data1({ foo: 4 }),
    ];
    const stream = new DataStream("foo", source);

    const boundary = new StreamBoundary({ start: null, end: null } as any);
    const result: (Data1 | Data2 )[] = [];
    let count = 0;
    //const result = [...stream.stream(boundary)];
    for await (const data of stream.stream(boundary)) {
      if (count > 3) {
        break;
      }
      result.push(data);
      count++;
    }
    expect(result).toMatchObject([]);
  });
});