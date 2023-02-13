import z from "myzod";
import { valueObjectClassFactory } from "../../core/value-object/value-object-factory";

export const emailSchema = z.string()
    .pattern(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/);

export class Email extends valueObjectClassFactory("Email", emailSchema) {}