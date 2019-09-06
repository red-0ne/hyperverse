import "reflect-metadata";

import { ReflectiveInjector } from "injection-js";

import { DEFAULTS } from "../../src/defaults";
import { ExternalRegistries } from "../../src/registry";
import { Runner } from "../../src/runner";
import { HashingService } from "./application/hasher";
import { mainRegistry } from "./main-registry.pub";

const injector = ReflectiveInjector.resolveAndCreate([
  { provide: ExternalRegistries, useValue: [ mainRegistry ] },
  DEFAULTS,
  HashingService,
]);

injector.get(HashingService);
injector.get(Runner).start();
