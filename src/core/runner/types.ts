import { InternalError, InvalidParameters, ServiceUnavailable, UnknownCommand } from "./errors";

export const CommandErrors = [
  InvalidParameters,
  InternalError,
  UnknownCommand,
  ServiceUnavailable,
] as const;