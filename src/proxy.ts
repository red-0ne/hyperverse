import "reflect-metadata";

import { IConstructor, PromiseReturn } from "./lang";
import { Logger } from "./logger";
import { PeerSelector } from "./peer-selector";
import { Registry } from "./registry";
import { Runner } from "./runner";

export function ClassProxy<T>(service: T, peerSelector?: typeof PeerSelector) {
  return {
    provide: service,
    useFactory: (runner: Runner, registry: Registry, logger: Logger) => {
      peerSelector = peerSelector || PeerSelector;
      return proxyFactory(service, runner, new peerSelector(registry), logger);
    },
    deps: [ Runner, Registry, Logger ],
  };
}

function proxyFactory<T>(service: T, runner: Runner, selector: PeerSelector, logger: Logger) {
  const proxy = {} as PromiseReturn<T>;
  const serviceName: string = (service as any).name;

  generateServiceMethods(service).forEach(method => {
    (proxy as any)[method] = async (...args: any[]) => {
      logger.log("debug", "PROXY", "PICKING_SERVICE_INSTANCE", serviceName);
      const peerId = await selector.getPeer(serviceName);

      logger.log("debug", "PROXY", "CALL", `${serviceName}.${method}(${args.length} args)`);
      return runner.transmit(peerId, serviceName, method, args);
    };
  });

  return proxy;
}

export function generateServiceMethods(service: any) {
  const methods: any[] = [];

  methods.push(...(Reflect.getMetadata("serviceMetadata", service) || []));

  (service.components || []).forEach((component: IConstructor<any>) => {
    methods.push(...(Reflect.getMetadata("serviceMetadata", component) || []));
  });

  return methods;
}
