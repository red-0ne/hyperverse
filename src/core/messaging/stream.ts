import { ErrorObject, ErrorObjectConstructor } from "../errors";
import { StreamService } from "../stream/stream-service";
import { ValueObject, ValueObjectConstructor } from "../value-object";

export abstract class StreamReply<
  Success extends StreamService = StreamService,
  Failures extends [...ErrorObjectConstructor<any, any>[]] = [...ErrorObjectConstructor<any, any>[]],
> extends Promise<Success | InstanceType<Failures[number]>> {
  static readonly success: ValueObject;
  static readonly failures: [...ErrorObject[]];
  abstract readonly success: Success;
  abstract readonly failures: Failures;
}