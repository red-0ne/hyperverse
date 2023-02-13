import { Injectable, InjectionToken } from "injection-js";
import { dependencyBundleFactory } from "../../../core/bundle-di";
import { RemoteServiceRegistry, remoteServiceRegistryToken, Service } from "../../../core/registry/remote-service-registry";
import { PeerInfo } from "../../../core/registry/types";
import { ServiceToken } from "../../../core/utils";
import { Contacts } from "../../types/contacts";
import { User, UserId } from "../../types/user";
import { StorageManager, storageManagerToken } from "./storage-manager";

class ConnectionManager {
  getConnection(peers: Set<PeerInfo>) {}
}

const connectionManagerToken = new InjectionToken<ConnectionManager>("ConnectionManager");

class NetworkDeps extends dependencyBundleFactory({
  connectionManager: connectionManagerToken,
  serviceRegistry: remoteServiceRegistryToken,
}) {}

class Network {
  static readonly deps = NetworkDeps;

  #connectionManager: ConnectionManager;
  #serviceRegistry: RemoteServiceRegistry;

  constructor({ serviceRegistry, connectionManager }: NetworkDeps) {
    this.#connectionManager = connectionManager;
    this.#serviceRegistry = serviceRegistry;
  }

  proxy<
  T extends Service,
  M extends keyof T,
  A extends (T[M] extends (...args: any[]) => Promise<any> ? Parameters<T[M]> : []),
  R extends (T[M] extends (...args: any[]) => Promise<any> ? ReturnType<T[M]> : never),
  >(service: ServiceToken<T>, method: M, args: A): R {
    const peers = this.#serviceRegistry.getPeerSetFor(service, method);
    const conn = this.#connectionManager.getConnection(peers);
    return conn.request(service, method, args);
  }
}

@Injectable()
export class RemoteStorageManager implements StorageManager {
  #network: Network;
  #service = storageManagerToken;

  constructor(network: Network) {
    this.#network = network;
  }

  async save(id: UserId, contacts: Contacts): Promise<void> {
    return this.#network.proxy(this.#service, "save", [id, contacts]);
  }

  async get(id: UserId): Promise<User | undefined> {
    return this.#network.proxy(this.#service, "get", [id]);
  }
}