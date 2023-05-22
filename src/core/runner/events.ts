import z from "myzod";
import { domainEventClassFactory } from "../domain-event/domain-event";
import { Register } from "../value-object/register";
import { PeerInfo } from "../messaging";

@Register
export class PeerUpdated extends domainEventClassFactory(
  "Core::ValueObject::DomainEvent::PeerUpdated",
  z.object({
    services: z.record(z.array(z.string())),
    peerInfo: PeerInfo.schema(),
  }),
) {}
