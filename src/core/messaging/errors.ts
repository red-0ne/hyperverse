import z from "myzod";
import { Register, valueObjectClassFactory } from "../value-object";
import { messageSchema } from "./message";
import { errorObjectClassFactory } from "../errors";

@Register
export class UnknownCommand extends errorObjectClassFactory(
  "Core::ValueObject::Error::UnknownCommand",
  z.object({
    context: z.unknown(),
  }),
) {}

@Register
export class UnknownCommandMessage extends valueObjectClassFactory(
  "Core::ValueObject::Message::Data::UnknownCommand",
  z.object({
    ...messageSchema.shape(),
    payload: UnknownCommand.schema(),
  }),
) {}