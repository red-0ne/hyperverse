import z from "myzod";
import { Contacts } from "./contacts";
import { valueObjectClassFactory } from "../../core/value-object/value-object-factory";

export class UserId extends valueObjectClassFactory("UserId", z.string().min(1)) {}

export const userSchema = z.object({
  contacts: Contacts.schema.nullable(),
  userId: UserId.schema,
  fullName: z.string(),
});
export class User extends valueObjectClassFactory("User", userSchema) {}