import { Runner } from "./runner";

export type PromiseReturn<T> = {
  [M in keyof T]: Extract<T[M], (...args: any[]) => Promise<any>>;
};

export enum INSTRUCTION {
  call,
  result,
  subscription,
}

export interface IPendingRequest {
  resolve: (result: any) => void;
  reject: (error: any) => void;
}

export interface IKeyPair {
  id: string;
  pubKey: string;
  privKey?: string;
}

export interface IPeerId {
  id: IKeyPair;
  addresses: string[];
}

export interface IRegistryRecord {
  name: string;
  methods: string[];
  peerId?: IPeerId;
}

export interface IPeerInfo {
  id: { toJSON: () => IKeyPair };
  multiaddrs: {
    add(address: string): void;
  };
}

export interface IConnectionState {
  connection: any;
  pushable: { push: (...msg: any[]) => any };
  requests: Map<number, IPendingRequest>;
}

export interface IConstructor<T> {
  new: (...args: any[]) => T;
}

export type StartedRunner = Runner & { peerId: IPeerId };

export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
