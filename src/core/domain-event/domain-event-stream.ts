import { StreamBoundary, StreamFQN } from "../stream/stream-service";
import { ValueObjectFQN } from "../value-object/types";
import { DomainEventConstructor } from "./types";

// This should be extended from StreamService, currently DomainEventConstructor is
// not compatible with ValueObjectConstructor in StreamService
export type DomainEventStreamService<
  Name extends StreamFQN<string, string> = any,
  DataConstructors extends { [key: number]: DomainEventConstructor<ValueObjectFQN<string, `DomainEvent::${string}`>, any> } = any,
  Data = InstanceType<DataConstructors[number]>,
> = {
  readonly FQN: Name;
  readonly ids: DataConstructors;

  lastData?: Data;

  emit(data: Data): Promise<void>;
  stream(limit: StreamBoundary): AsyncIterable<Data>;
  ready(): Promise<void>;
}