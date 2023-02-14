import z from "myzod"
import { domainEventClassFactory } from "../domain-event/domain-event";
import { PeerInfo } from "./types";

export class PeerUpdated extends domainEventClassFactory(
  "Core::ValueObject::DomainEvent::PeerUpdated",
  z.object({
    services: z.record(z.array(z.string())),
    peerInfo: PeerInfo.schema(),
  }),
) {}