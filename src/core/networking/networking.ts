import { InjectionToken } from "injection-js";
import { Message } from "../messaging/message";

export type NetworkingService = {
  send(message: Message): Promise<void>;
  messages(): AsyncIterable<Message>;
};

export const NetworkingServiceToken = new InjectionToken<NetworkingService>("NetworkingService");
