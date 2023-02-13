import { InjectionToken } from "injection-js";
import { ServiceToken } from "../utils";

export type AnyDependency = any;
export type DependencyBundleTokenMap = { [key: string]: InjectionToken<AnyDependency> | ServiceToken<AnyDependency> };
export type UnwrapITs<T extends [...any[]]> = T extends [infer Head, ...infer Tail] ? [UnwrapIT<Head>, ...UnwrapITs<Tail>] : [];
export type UnwrapIT<T> = T extends ServiceToken<infer U> ? U : T extends InjectionToken<infer U> ? U : never;
export type InferDep<D extends DependencyBundleTokenMap> = { [K in keyof D]: UnwrapIT<Extract<D[K], D[number]>> };