import { UnknownCommand } from "../messaging/errors";
import { InternalError, InvalidParameters, ServiceUnavailable } from "./errors";

export const CommandErrors = [
  InvalidParameters,
  InternalError,
  UnknownCommand,
  ServiceUnavailable,
] as const;