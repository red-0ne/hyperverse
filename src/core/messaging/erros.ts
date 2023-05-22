import z from "myzod";
import { UnknownCommand } from "../runner";
import { Register, valueObjectClassFactory } from "../value-object";
import { messageSchema } from "./message";

@Register
export class UnknownCommandMessage extends valueObjectClassFactory(
  "Core::ValueObject::Message::Data::UnknownCommand",
  z.object({
    ...messageSchema.shape(),
    payload: UnknownCommand.schema(),
  }),
) {}
