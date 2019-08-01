import libp2p from "libp2p";
import PeerInfo from "peer-info";
import Pushable from "pull-pushable";
import pull from "pull-stream";

import { Exception } from "./errors";
import { IConnectionState, INSTRUCTION, IPeerId, IPeerInfo } from "./lang";
import { RunnerConfig } from "./runner-config";

export class CommNode extends libp2p {
  public peers: { [ peerId: string ]: IConnectionState } = {};
  constructor(config: ReturnType<RunnerConfig["parse"]>, public readonly peerId: IPeerId) {
    super(config);
  }

  public sendMessage(peerId: IPeerId, requestId: number, instruction: INSTRUCTION, message: any) {
    const msg = JSON.stringify({ requestId, instruction, message });

    if (!this.peers[peerId.id.id]) {
      const pushable = Pushable();

      this.peers[peerId.id.id] = { connection: undefined, requests: new Map(), pushable };
      PeerInfo.create(peerId.id, (createError: any, peerInfo: IPeerInfo) => {
        if (createError) {
          throw new Exception("COMMUNICATION", "PEER_CREATION_FAILED", createError);
        }

        peerId.addresses.forEach(addr => peerInfo.multiaddrs.add(addr));

        this.dialProtocol(peerInfo, "/hyperverse/json/1", (dialError: any, connection: any) => {
          if (dialError) {
            throw new Exception("COMMUNICATION", "DIAL_FAILED", dialError);
          }

          this.peers[peerId.id.id].connection = connection;
          pull(pushable, connection);

          pushable.push(msg);
        });
      });
    } else {
      this.peers[peerId.id.id].pushable.push(msg);
    }

    return new Promise((resolve, reject) => {
      this.peers[peerId.id.id].requests.set(requestId, { resolve, reject });
    });
  }

  public handleMessages(callBack: (...args: any[]) => Promise<any>) {
    this.handle("/hyperverse/json/1", (_: unknown, conn: any) => {
      conn.getPeerInfo((err: any, peerInfo: any) => {
        if (err) {
          throw new Exception("COMMUNICATION", "PEER_INFO_FAILED", err);
        }

        pull(conn, pull.drain((data: any) => {
          try {
            data = data.toString("utf8");
            const { requestId, instruction, message } = JSON.parse(data);
            const keyPair = peerInfo.id.toJSON();
            const addresses = peerInfo.multiaddrs.toArray().map((a: Buffer) => a.toString());

            switch (instruction) {
              case INSTRUCTION.call:
                const { service, method, payload } = message;
                const peerId = { id: keyPair, addresses };

                callBack(service, method, payload, peerId).then((result: any) => {
                  this.sendMessage(peerId, requestId, INSTRUCTION.result, result);
                });
                break;
              case INSTRUCTION.result:
                const resolver = this.peers[keyPair.id].requests.get(requestId);

                if (resolver) {
                  this.peers[keyPair.id].requests.delete(requestId);
                  message.ok ? resolver.resolve(message.result) : resolver.reject(message.error);
                }
                break;
              default:
                break;
            }
          } catch (err) {
            throw new Exception("COMMUNICATION", "PARSE", err);
          }
        }));
      });
    });
  }
}
