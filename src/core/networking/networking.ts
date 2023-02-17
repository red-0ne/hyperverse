import { InjectionToken } from "injection-js";
import { Message } from "../messaging/message";
import { ValueObject } from "../value-object";

export type NetworkingService = {
  send(
    data: ValueObject,
    id: Message["id"],
    origin: Message["origin"],
  ): Promise<void>;
  messages<
    FilteredMessage extends Message,
    MessageTypesFilter extends (message: Message) => FilteredMessage,
  >(filter?: MessageTypesFilter): AsyncIterable<ReturnType<MessageTypesFilter>>;
}

export const NetworkingServiceToken = new InjectionToken<NetworkingService>("NetworkingService");
