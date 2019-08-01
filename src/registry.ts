import { Inject, Injectable, InjectionToken, Optional } from "injection-js";
import { BaseMicroService } from "./base";
import { IPeerId, IRegistryRecord } from "./lang";
import { Logger } from "./logger";
import { generateServiceMethods } from "./proxy";
import { Runner } from "./runner";

export const ExternalRegistries = new InjectionToken("ExternalRegistries");

@Injectable()
export class Registry {
  protected services: Map<string, Map<string, IRegistryRecord>> = new Map();
  protected localServices: Set<IRegistryRecord> = new Set();

  constructor(
    protected runner: Runner,
    protected logger: Logger,
    @Inject(ExternalRegistries) @Optional() protected externalRegistries?: IPeerId[],
  ) {
    this.runner.registerInstance(this);

    if (!this.externalRegistries) {
      this.logger.log("debug", "REGISTRY", "NO_EXTERNAL_REGISTRIES");
      this.externalRegistries = [];
    }

    if (this.externalRegistries.length) {
      this.runner.onStart(() => {
        this.publish(Array.from(this.localServices.values()));
      });
    }
  }

  public registerLocalService(service: BaseMicroService) {
    const name = service.constructor.name;

    this.runner.registerInstance(service);

    this.logger.log("debug", "REGISTRY", "REGISTERING_LOCAL_SERVICE", name);

    this.localServices.add({
      name,
      methods: generateServiceMethods(service.constructor),
    });
  }

  public async register(services: IRegistryRecord[], peerId?: IPeerId) {
    services.forEach(s => {
      this.logger.log("debug", "REGISTRY", "REGISTERING_REMOTE_SERVICE", s.name);

      if (!this.services.has(s.name)) {
        this.services.set(s.name, new Map());
      }

      if (peerId) {
        s.peerId = peerId;
      }
      this.services.get(s.name)!.set(s.peerId!.id.id, s);
    });
  }

  public async getService(serviceName: string) {
    const services = this.services.get(serviceName);

    this.logger.log("debug", "REGISTRY", "QUERY_LOCAL_SERVICE_CACHE", serviceName);
    return services ? Array.from(services.values()) : [];
  }

  public async import(serviceName: string) {
    this.logger.log("debug", "REGISTRY", "IMPORT_REMOTE_SERVICE_INSTANCES", serviceName);

    if (!this.externalRegistries) {
      this.logger.log("debug", "REGISTRY", "NO_REMOTE_REGISTRY_TO_IMPORT_FROM");
      return [];
    }

    const args = [ "Registry", "getService", [ serviceName ] as any ] as const;
    const gatherServices = this.externalRegistries.map((peerId: IPeerId) =>
      this.runner.transmit<Registry["getService"]>(peerId, ...args).catch(() => null));

    return Promise.all(gatherServices).then(allServices => allServices.forEach(services => {
      if (services) {
        this.register(services);
      }
    }));
  }

  public async publish(services: IRegistryRecord[]) {
    if (this.externalRegistries) {
      this.externalRegistries.forEach(peerId => {
        this.logger.log("debug", "REGISTRY", "PUBLISHING_LOCAL_SERVICES", services.length);
        this.runner.transmit(peerId, "Registry", "register", [ services ]);
      });
    }
  }
}
