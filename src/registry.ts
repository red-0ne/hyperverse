import { Inject, Injectable, InjectionToken, Optional } from "injection-js";
import { BaseMicroService } from "./base";
import { IPeerId, IRegistryRecord } from "./lang";
import { generateServiceMethods } from "./proxy";
import { Runner } from "./runner";

export const ExternalRegistries = new InjectionToken("ExternalRegistries");

@Injectable()
export class Registry {
  protected services: Map<string, Map<string, IRegistryRecord>> = new Map();
  protected localServices: Set<IRegistryRecord> = new Set();

  constructor(
    protected runner: Runner,
    @Inject(ExternalRegistries) @Optional() protected externalRegistries?: IPeerId[],
  ) {
    this.runner.registerInstance(this);

    if (!this.externalRegistries) {
      this.externalRegistries = [];
    }

    if (this.externalRegistries.length) {
      this.runner.onStart(() => {
        this.publish(Array.from(this.localServices.values()));
      });
    }
  }

  public registerLocalService(service: BaseMicroService) {
    this.localServices.add({
      name: service.constructor.name,
      methods: generateServiceMethods(service.constructor),
    });

    this.runner.registerInstance(service);
  }

  public async register(services: IRegistryRecord[], peerId?: IPeerId) {
    services.forEach((s) => {
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

    return services ? Array.from(services.values()) : [];
  }

  public async import(serviceName: string) {
    if (!this.externalRegistries) {
      return [];
    }

    const gatherServices = this.externalRegistries.map((peerId) =>
      this.runner.transmit(peerId, "Registry", "getService", [ serviceName ]).catch(() => null));

    return Promise.all(gatherServices).then((services) => services.forEach((service) => {
      if (service) {
        this.register(service);
      }
    }));
  }

  public async publish(services: IRegistryRecord[]) {
    if (this.externalRegistries) {
      this.externalRegistries.forEach((peerId) => {
        this.runner.transmit(peerId, "Registry", "register", [ services ]);
      });
    }
  }
}
