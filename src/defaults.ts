import { Logger, LogLevel } from "../src/logger";
import { Registry } from "../src/registry";
import { Runner } from "../src/runner";
import { RunnerConfig } from "../src/runner-config";

export const DEFAULTS = [
  { provide: LogLevel, useValue: 0x3f },
  RunnerConfig,
  Runner,
  Registry,
  Logger,
];
