import { InjectionToken } from "injection-js";
import { Message } from "../messaging/message";

export type NetworkingService = {
  send<Msg extends Message>(
    data: Msg["payload"],
    id: Msg["id"],
    origin: Msg["origin"],
  ): Promise<void>;
  messages<
    FilteredMessage extends Message,
    MessageTypesFilter extends (message: Message) => FilteredMessage,
  >(filter?: MessageTypesFilter): AsyncIterable<ReturnType<MessageTypesFilter>>;
}

export const NetworkingServiceToken = new InjectionToken<NetworkingService>("NetworkingService");
