import z from "myzod";
import { Address } from "./address";
import { Email } from "./email";
import { Phone } from "./phone";
import { valueObjectClassFactory } from "../../core/value-object/value-object-factory";

export const contactsSchema = z.object({
    phones: z.array(Phone.schema),
    addresses: z.array(Address.schema),
    emails: z.array(Email.schema),
});

export class Contacts extends valueObjectClassFactory("Contact", contactsSchema) {}