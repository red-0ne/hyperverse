import z from "myzod";
import { positiveIntegerSchema } from "../../core/utils";
import { valueObjectClassFactory } from "../../core/value-object/value-object-factory";

export const phoneSchema = z.object({
  label: z.string().min(1),
  countryPhoneCode: positiveIntegerSchema.min(1),
  countryCode: z.string().min(2).max(3),
  number: z
    .string()
    .pattern(/^[0-9\. -]+$/)
    .map((v) => v.replace(/[\. -]/, ""))
});

export class Phone extends valueObjectClassFactory("Phone", phoneSchema) {}
