import { Injectable, Optional } from "injection-js";

import { BaseMicroService } from "./base";
import { CommNode } from "./comm-node";
import { Exception } from "./errors";
import { INSTRUCTION, IPeerId, StartedRunner } from "./lang";
import { RunnerConfig } from "./runner-config";

@Injectable()
export class Runner {
  public peerId: IPeerId | undefined;

  protected commNode: Promise<CommNode>;
  protected startEventListeners: Array<(...args: any[]) => void> = [];
  protected serviceInstances: Map<string, BaseMicroService> = new Map();
  protected requestIdCounter = 0;

  constructor(@Optional() runnerConfig?: RunnerConfig) {
    this.commNode = (runnerConfig || new RunnerConfig()).initNode();

    this.onStart((commNode: CommNode) => {
      const addresses: any[] = [];

      commNode.peerInfo.multiaddrs.forEach((a: Buffer) => addresses.push(a.toString()));
      this.peerId = { id: commNode.peerId.id, addresses };
    });
  }

  public registerInstance(instance: any) {
    this.serviceInstances.set(instance.constructor.name, instance);
  }

  public onStart(callback: (...args: any[]) => void) {
    this.startEventListeners.push(callback);
  }

  public async start(): Promise<StartedRunner> {
    const node = await this.commNode;

    return new Promise((resolve) => {
      node.start(() => {
        node.handleMessages(this.handleCalls.bind(this));
        this.startEventListeners.forEach((callback) => callback(node));
        resolve(this as StartedRunner);
      });

    });
  }

  public async transmit(peerId: IPeerId, service: string, method: string, payload: any[]) {
    return this.commNode.then((comm) => comm.sendMessage(
      peerId,
      this.requestIdCounter++,
      INSTRUCTION.call,
      { service, method, payload },
    )) as Promise<any>;
  }

  protected handleCalls(serviceName: string, method: string, payload: any[], peerId: IPeerId) {
    if (!this.serviceInstances.has(serviceName)) {
      return Promise.reject({
        ok: false,
        error: new Exception("EXEC", "INVALID_SERVICE", serviceName),
      });
    }

    const service: any = this.serviceInstances.get(serviceName);

    if (!service[method]) {
      return Promise.reject({
        ok: false,
        error: new Exception("EXEC", "INVALID_CALL", [ serviceName, method ]),
      });
    }

    // TODO: Check if service[method] is allowed to be called (as @Channel decorator)

    return service[method](...payload, peerId)
      .then((result: any) => ({ ok: true, result }))
      .catch((error: any) => ({ ok: false, error }));
  }
}
