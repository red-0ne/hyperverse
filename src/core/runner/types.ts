import z from "myzod"
import { valueObjectClassFactory, ValueObjectConstructor } from "../value-object";
import { ValueObjectFQN } from "../value-object/types";

export type ValueObjectMap<Name extends ValueObjectFQN = ValueObjectFQN>
  = Map<Name, ValueObjectConstructor<Name>>;

export const peerIdSchema = z.object({ value: z.string() }); // this should be a public key
export class PeerId extends valueObjectClassFactory(
  "Core::ValueObject::PeerId",
  peerIdSchema
) {}

export const peerInfoSchema = z.object({
  peerId: PeerId.schema(),
  hosts: z.array(z.string().map(v => new URL(v))),
});
export class PeerInfo extends valueObjectClassFactory(
  "Core::ValueObject::PeerInfo",
  peerInfoSchema
) {}
