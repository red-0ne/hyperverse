import { Exception } from "./errors";
import { Registry } from "./registry";

export class PeerSelector {
  constructor(protected registry: Registry) {}

  public async getPeer(serviceName: string) {
    let existingServices = await this.registry.getService(serviceName);

    if (!existingServices.length) {
      await this.registry.import(serviceName);
      existingServices = await this.registry.getService(serviceName) || [];
    }

    const remoteRecord = existingServices.find((record) => record.peerId);

    if (!remoteRecord) {
      throw new Exception("REGISTRY", "UNKNOWN_SERVICE", serviceName);
    }

    if (!remoteRecord.peerId) {
      throw new Exception("REGISTRY", "UNAVAILABLE_SERVICE", serviceName);
    }

    return remoteRecord.peerId;
  }
}
