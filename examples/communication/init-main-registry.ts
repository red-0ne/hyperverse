import "reflect-metadata";

import { ReflectiveInjector } from "injection-js";

import { DEFAULTS } from "../../src/defaults";
import { Registry } from "../../src/registry";
import { Runner } from "../../src/runner";
import { PeerId } from "../../src/runner-config";
import { mainRegistry } from "./main-registry.priv";

const injector = ReflectiveInjector.resolveAndCreate([
  DEFAULTS,
  { provide: PeerId, useValue: mainRegistry },
]);

injector.get(Registry);
injector.get(Runner).start();
