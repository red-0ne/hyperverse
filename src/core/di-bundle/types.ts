import { InjectionToken } from "injection-js";

export type DependencyBundleTokenMap = {
  [key: string]: InjectionToken<any>;
};

export type UnwrapITs<T extends [...any[]]> = T extends [infer Head, ...infer Tail] ? [UnwrapIT<Head>, ...UnwrapITs<Tail>] : [];

export type UnwrapIT<T> = T extends InjectionToken<infer U> ? U : never;

export type InferDep<D extends DependencyBundleTokenMap> = {
  [K in keyof D]: UnwrapIT<Extract<D[K], D[number]>>;
};
