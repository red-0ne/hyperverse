import z, { ObjectShape } from "myzod";

import { positiveIntegerSchema } from "../utils";
import { valueObjectClassFactory } from "../value-object";
import { FQN, ValueObjectConstructor, ValueObjectFQN } from "../value-object/types";

const streamBoundarySchema = z.object({
  start: positiveIntegerSchema.or(z.literal(Infinity)).or(z.null().map(_ => Infinity)),
  end: positiveIntegerSchema.or(z.literal(Infinity)).or(z.null().map(_ => Infinity)),
}).withPredicate(v => v.end >= v.start);

export class StreamBoundary extends valueObjectClassFactory(
  "Core::ValueObject::StreamBoundary",
  streamBoundarySchema,
) {}

export type StreamService<
  Name extends StreamFQN<string, string> = any,
  DataConstructors extends { [key: number]: ValueObjectConstructor<ValueObjectFQN, any> } = any,
  Data = InstanceType<DataConstructors[number]>,
> = {
  readonly FQN: Name;
  readonly ids: DataConstructors;

  lastData?: Data;

  emit(data: Data): Promise<void>;
  stream(limit: StreamBoundary): AsyncIterable<Data>;
  ready(): Promise<void>;
}

export type StreamFQN<
  Domain extends string = string,
  Implementation extends string = string
> = FQN<Domain, "Stream", Implementation>;