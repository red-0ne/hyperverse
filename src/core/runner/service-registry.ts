import { InjectionToken } from "injection-js";
import { DomainEventStreamService } from "../domain-event";
import { StreamBoundary } from "../stream/stream-service";
import { Compute } from "../utils";
import { PeerUpdated } from "./events";

const fqn = `Core::Stream::DomainEvent::PeerUpdates`;

export type PeerUpdatesStream = Compute<DomainEventStreamService<typeof fqn> & {
  FQN: typeof fqn;
  ids: [typeof PeerUpdated];
  emit(payload: ReturnType<typeof PeerUpdated["from"]>): Promise<void>;
  stream(limit?: StreamBoundary): AsyncIterable<PeerUpdated>;
  ready(): Promise<void>;
}>

export const PeerUpdatesStreamToken = new InjectionToken<PeerUpdatesStream>(fqn);