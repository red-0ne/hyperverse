import z from "myzod";
import { valueObjectClassFactory, ValueObjectConstructor } from "../value-object";
import { ValueObjectFQN } from "../value-object/types";
import { Register } from "../value-object/register";
import { stringToURLSchema } from "../utils";

export type ValueObjectMap<Name extends ValueObjectFQN = ValueObjectFQN> = Map<Name, ValueObjectConstructor<Name>>;

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
