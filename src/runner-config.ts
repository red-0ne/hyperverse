import { Inject, Injectable, InjectionToken, Optional } from "injection-js";
import SECIO from "libp2p-secio";
import SPDY from "libp2p-spdy";
import TCP from "libp2p-tcp";
import PeerInfo from "peer-info";

import { CommNode } from "./comm-node";
import { Exception } from "./errors";
import { IPeerId, IPeerInfo } from "./lang";

const defaultModules = {
  transport: [ TCP ],
  streamMuxer: [ SPDY ],
  connEncryption: [ SECIO ],
};

const defaultMultiaddrs = [ "/ip4/0.0.0.0/tcp/0" ];

export const RunnerAddresses = new InjectionToken("RunnerAddresses");
export const RunnerModules = new InjectionToken("RunnerModules");
export const PeerId = new InjectionToken("PeerId");

@Injectable()
export class RunnerConfig {
  protected peerInfo?: IPeerInfo;
  protected multiAddrs: string[];
  protected modules: any;
  protected peerId: IPeerId | null;

  constructor(
    @Inject(RunnerAddresses) @Optional() multiAddrs?: string[],
    @Inject(RunnerModules) @Optional() modules?: any,
    @Inject(PeerId) @Optional() initialId?: IPeerId,
  ) {
    if (initialId && initialId.addresses) {
      this.multiAddrs = initialId.addresses;
    } else {
      this.multiAddrs = multiAddrs || defaultMultiaddrs;
    }
    this.modules = modules || defaultModules;
    this.peerId = initialId ? { id: initialId.id, addresses: this.multiAddrs } : null;
  }

  public initNode(): Promise<CommNode> {
    return new Promise((resolve, reject) => {
      const cb = (err: any, peerInfo: IPeerInfo) => {
        if (err) {
          reject(err);
        }

        this.multiAddrs.forEach(addr => peerInfo.multiaddrs.add(addr));
        this.peerInfo = peerInfo;

        const id = peerInfo.id.toJSON();
        delete id.privKey;

        const addresses = [ ...this.multiAddrs ];

        this.peerId = { id, addresses};

        resolve(new CommNode(this.parse(), this.peerId));
      };

      this.peerId ? PeerInfo.create(this.peerId.id, cb) : PeerInfo.create(cb);
    });
  }

  protected parse() {
    if (!this.multiAddrs.length) {
      throw new Exception("COMMUNICATION", "MISSING_PEER_INFO", null);
    }

    return {
      modules: this.modules,
      peerInfo: { ...this.peerInfo, ...{ addresses: this.multiAddrs } },
    };
  }
}
