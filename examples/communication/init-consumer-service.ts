import "reflect-metadata";

import { ReflectiveInjector } from "injection-js";

import { DEFAULTS } from "../../src/defaults";
import { ClassProxy } from "../../src/proxy";
import { ExternalRegistries } from "../../src/registry";
import { Runner } from "../../src/runner";
import { Consumer } from "./application/consumer";
import { HashingService } from "./application/hasher";
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

  let buffer: string = "";

  process.stdin.on("data", (data: string) => {
    let lines: string[];
    buffer += data;

    [ buffer, ...lines ] = buffer.split("\n").reverse();

    // tslint:disable-next-line:no-console
    lines.map((line: string) => consumer.hashData(line).then(console.log));
  });
});
