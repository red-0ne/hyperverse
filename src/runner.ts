import { Injectable, Optional } from "injection-js";

import { BaseMicroService } from "./base";
import { CommNode } from "./comm-node";
import { Exception } from "./errors";
import { INSTRUCTION, IPeerId, StartedRunner, UnwrapPromise } from "./lang";
import { Logger } from "./logger";
import { RunnerConfig } from "./runner-config";

@Injectable()
export class Runner {
  public peerId: IPeerId | undefined;

  protected commNode: Promise<CommNode>;
  protected startEventListeners: Array<(...args: any[]) => void> = [];
  protected serviceInstances: Map<string, BaseMicroService> = new Map();
  protected requestIdCounter = 0;

  constructor(protected logger: Logger, @Optional() runnerConfig?: RunnerConfig) {
    this.commNode = (runnerConfig || new RunnerConfig()).initNode();

    this.onStart((commNode: CommNode) => {
      const addresses: any[] = [];

      commNode.peerInfo.multiaddrs.forEach((a: Buffer) => addresses.push(a.toString()));
      this.peerId = { id: commNode.peerId.id, addresses };
    });
  }

  public registerInstance(instance: any) {
    this.logger.log("debug", "RUNNER", "REGISTERING_INSTANCE", instance.constructor.name);
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

        this.logger.log("debug", "RUNNER", "STARTED_RUNNER", this.peerId!.addresses);
        resolve(this as StartedRunner);
      });

    });
  }

  public async transmit<T extends (...args: any) => any>(
    peerId: IPeerId,
    service: string,
    method: string,
    payload: any[],
  ) {
    return this.commNode.then((comm) => comm.sendMessage(
      peerId,
      this.requestIdCounter++,
      INSTRUCTION.call,
      { service, method, payload },
    )) as UnwrapPromise<ReturnType<T>>;
  }

  protected handleCalls(serviceName: string, method: string, args: any[], peerId: IPeerId) {
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

    const callIdentity = `${serviceName}.${method}(${args.length} args)`;
    this.logger.log("debug", "RUNNER", "EXECUTE_REMOTE_CALL", callIdentity);

    // TODO: Check if service[method] is allowed to be called (as @Channel decorator)
    return service[method](...args, peerId)
      .then((result: any) => ({ ok: true, result }))
      .catch((error: any) => ({ ok: false, error }));
  }
}
