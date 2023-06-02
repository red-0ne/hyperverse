import { InjectionToken } from "injection-js";
import { Message } from "../messaging/message";

export type NetworkingService = {
  send(message: Message): Promise<void>;
  messages(): AsyncIterable<Message>;
  ready(): Promise<void>;
};

export const NetworkingServiceToken = new InjectionToken<NetworkingService>("NetworkingService");
