import z from "myzod";
import { positiveIntegerSchema, stringToURLSchema } from "../utils";
import { PeerId } from "./peer";
import { CommandMessage } from "./command";
import { DataMessage } from "./data";
import { randomUUID } from "crypto";

export const messageSchema = z.object({
  id: z.string().default(() => randomUUID()),
  sequence: positiveIntegerSchema,
  length: positiveIntegerSchema,
  end: z.boolean(),
  origin: z.object({
    peerId: PeerId.schema(),
    host: stringToURLSchema
  }),
  destination: z.object({
    peerId: PeerId.schema(),
    host: stringToURLSchema
  }),
  payload: z.unknown(),
});

export const singleMessageSchema = messageSchema.and(z.object({
  sequence: z.literal(0),
  length: z.literal(1),
  end: z.literal(true),
}));

export type Message = CommandMessage | DataMessage;
