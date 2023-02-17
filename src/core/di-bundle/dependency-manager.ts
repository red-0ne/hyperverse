import { Injector, Provider } from "injection-js"
import { Constructor } from "../utils";
import { DependencyBundleTokenMap, InferDep, UnwrapIT, UnwrapITs } from "./types";

function makeTokenProvider<K extends keyof T & string, T extends DependencyBundleTokenMap>(
  bundle: Constructor<unknown>,
  providers: Record<string, Provider>,
  key: K,
  bundleMap: T
) {
  const dep = {
    asValue(value: UnwrapIT<T[K]>) {
      providers[key] = { provide: bundleMap[key], useValue: value };
      return this.makeProvider(providers);
    },
    asClass(ctor: Constructor<UnwrapIT<T[K]>>) {
      providers[key] = { provide: bundleMap[key], useClass: ctor };
      return this.makeProvider(providers);
    },
    asFactory<A extends [...any[]]>(factory: (...args: UnwrapITs<A>) => UnwrapIT<T[K]>, deps: [...A]) {
      providers[key] = { provide: bundleMap[key], useFactory: factory, deps };
      return this.makeProvider(providers);
    },
    makeProvider(providers: Record<string, Provider>) {
      return {
        provide: <R extends Exclude<Extract<keyof T, string>, K>>(key: R) => makeTokenProvider(bundle, providers, key, bundleMap),
        seal() {
          const sealedBundle = Object.values(providers)
          sealedBundle.push({
            provide: bundle,
            useFactory: (injector: Injector) => new bundle(injector),
            deps: [Injector],
          });

          return sealedBundle;
        }
      }
    }
  } as const;

  return dep as Exclude<typeof dep, "makeProvider">;
}

export function dependencyBundleFactory<T extends DependencyBundleTokenMap>(bundleMap: T) {
  const DependencyBundle = class {
    constructor(injector: Injector) {
      for (const key in bundleMap) {
        // @ts-expect-error we are dynamically building the class out of the bundleMap
        this[key] = injector.get(bundleMap[key]);
      }
    }

    public static provide<K extends keyof T & string>(key: K) {
      return makeTokenProvider(this, {}, key, bundleMap);
    }
  };

  return DependencyBundle as Constructor<InferDep<T>> & typeof DependencyBundle;
}