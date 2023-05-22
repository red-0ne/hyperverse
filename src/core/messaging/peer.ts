import * as z from "myzod";
import { stringToURLSchema } from "../utils";
import { Register, valueObjectClassFactory } from "../value-object";

export const peerIdSchema = z.object({ id: z.string() }); // this should be a public key

@Register
export class PeerId extends valueObjectClassFactory(
  "Core::ValueObject::PeerId",
  peerIdSchema,
) {}

export const peerInfoSchema = z.object({
  peerId: PeerId.schema(),
  hosts: z.array(stringToURLSchema),
});

@Register
export class PeerInfo extends valueObjectClassFactory(
  "Core::ValueObject::PeerInfo",
  peerInfoSchema,
) {}