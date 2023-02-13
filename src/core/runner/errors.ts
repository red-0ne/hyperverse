import z from "myzod";
import { errorObjectClassFactory } from "../errors";

export class UnknownStreamId extends errorObjectClassFactory(
  "Core::ValueObject::Error::UnknownStreamId",
  z.object({
    context: z.unknown(),
  }),
) {}

export class InvalidData extends errorObjectClassFactory(
  "Core::ValueObject::Error::InvalidData",
  z.object({
    expectedFQN: z.string(),
    context: z.unknown(),
  }),
) {}

export class UnknownService extends errorObjectClassFactory(
  "Core::ValueObject::Error::UnknownService",
  z.object({
    serviceFQN: z.string(),
  }),
) {}

export class UnknownCommand extends errorObjectClassFactory(
  "Core::ValueObject::Error::UnknownCommand",
  z.object({
    serviceFQN: z.string(),
    command: z.string(),
  }),
) {}

export class ServiceUnavailable extends errorObjectClassFactory(
  "Core::ValueObject::Error::ServiceUnavailable",
  z.object({
    serviceFQN: z.string(),
    command: z.string(),
  }),
) {}

export class UnexpectedError extends errorObjectClassFactory(
  "Core::ValueObject::Error::UnexpectedError",
  z.object({
    context: z.unknown(),
    error: z.unknown(),
  }),
) {}

export class ServiceNotInjected extends errorObjectClassFactory(
  "Core::ValueObject::Error::ServiceNotInjected",
  z.object({
    context: z.unknown(),
  }),
) {}

export class InternalError extends errorObjectClassFactory(
  "Core::ValueObject::Error::InternalError",
  z.object({}).allowUnknownKeys(),
) {
  constructor() {
    super({});
  }
}

export class InvalidMessage extends errorObjectClassFactory(
  "Core::ValueObject::Error::InvalidMessage",
  z.object({
    context: z.unknown(),
  }),
) {}

export class CommandNotFound extends errorObjectClassFactory(
  "Core::ValueObject::Error::CommandNotFound",
  z.object({
    context: z.unknown(),
  }),
) {}