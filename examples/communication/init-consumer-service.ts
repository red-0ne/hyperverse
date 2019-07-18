import "reflect-metadata";

import { ReflectiveInjector } from "injection-js";

import { DEFAULTS } from "../../src/defaults";
import { ClassProxy } from "../../src/proxy";
import { ExternalRegistries } from "../../src/registry";
import { Runner } from "../../src/runner";
import { Consumer } from "./classes/consumer";
import { HashingService } from "./classes/hasher";
import { mainRegistry } from "./main-registry.pub";

const injector = ReflectiveInjector.resolveAndCreate([
  { provide: ExternalRegistries, useValue: [ mainRegistry ] },
  ...DEFAULTS,
  Consumer,
  ClassProxy(HashingService),
]);

const consumer = injector.get(Consumer);
injector.get(Runner).start().then(() => {
  // tslint:disable-next-line:no-console
  console.log("Input data to hash:");
  // tslint:disable-next-line:no-console
  consumer.captureStdIn((line: string) => consumer.hashData(line).then(console.log));
});
