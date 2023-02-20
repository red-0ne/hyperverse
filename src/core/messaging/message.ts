import z from "myzod";
import { PeerInfo } from "../runner/types";
import { positiveIntegerSchema } from "../utils";
import { CommandMessage } from "./command";
import { DataMessage } from "./data";

export const messageSchema = z.object({
  id: z.string(),
  sequence: positiveIntegerSchema,
  length: positiveIntegerSchema,
  end: z.boolean(),
  origin: PeerInfo.schema(),
  payload: z.unknown(),
});

export type Message = CommandMessage | DataMessage;
