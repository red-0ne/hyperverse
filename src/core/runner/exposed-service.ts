import { CoreNamingService } from "./naming-service";
import { ServiceConfig, ServiceConstructor } from "./types";

export function expose<Service extends ServiceConstructor>(
  service: Service,
  config: ServiceConfig<Service>
): Service {
  CoreNamingService.registerService(service.FQN, config);
  return service;
}