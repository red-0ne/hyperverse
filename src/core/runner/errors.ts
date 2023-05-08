import z from "myzod";
import { errorObjectClassFactory } from "../errors";
import { Register } from "../value-object/register";

@Register
export class UnknownStreamId extends errorObjectClassFactory(
  "Core::ValueObject::Error::UnknownStreamId",
  z.object({
    context: z.unknown(),
  }),
) {}

@Register
export class InvalidData extends errorObjectClassFactory(
  "Core::ValueObject::Error::InvalidData",
  z.object({
    expectedFQN: z.string(),
    context: z.unknown(),
  }),
) {}

@Register
export class UnknownCommand extends errorObjectClassFactory(
  "Core::ValueObject::Error::UnknownCommand",
  z.object({
    context: z.unknown(),
  }),
) {}

@Register
export class ServiceUnavailable extends errorObjectClassFactory(
  "Core::ValueObject::Error::ServiceUnavailable",
  z.object({
    context: z.unknown(),
  }),
) {}

@Register
export class InvalidParameters extends errorObjectClassFactory(
  "Core::ValueObject::Error::BadParameters",
  z.object({
    expectedFQN: z.unknown(),
    context: z.unknown(),
  }),
) {}

@Register
export class InvalidReturn extends errorObjectClassFactory(
  "Core::ValueObject::Error::BadReturn",
  z.object({
    context: z.unknown(),
    expectedFQNs: z.array(z.string()).min(1),
    actualFQN: z.unknown(),
  }),
) {}

@Register
export class UnexpectedError extends errorObjectClassFactory(
  "Core::ValueObject::Error::UnexpectedError",
  z.object({
    context: z.unknown(),
    error: z.unknown(),
  }),
) {}

@Register
export class ServiceNotInjected extends errorObjectClassFactory(
  "Core::ValueObject::Error::ServiceNotInjected",
  z.object({
    context: z.unknown(),
  }),
) {}

@Register
export class InternalError extends errorObjectClassFactory(
  "Core::ValueObject::Error::InternalError",
  z.object({
    ref: z.unknown(),
  }),
) { }

@Register
export class InvalidMessage extends errorObjectClassFactory(
  "Core::ValueObject::Error::InvalidMessage",
  z.object({
    context: z.unknown(),
  }),
) {}

@Register
export class CommandNotFound extends errorObjectClassFactory(
  "Core::ValueObject::Error::CommandNotFound",
  z.object({
    context: z.unknown(),
  }),
) {}
