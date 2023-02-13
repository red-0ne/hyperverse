import z from "myzod";
import { positiveIntegerSchema } from "../../core/utils";
import { valueObjectClassFactory } from "../../core/value-object/value-object-factory";

export const addressSchema = z.object({
    label: z.string().min(1),
    streetNumber: positiveIntegerSchema.min(1),
    streetName: z.string().min(1),
    city: z.string().min(1),
    zipCode: positiveIntegerSchema.min(1),
    countryCode: z.string().min(2).max(3),
});

export class Address extends valueObjectClassFactory("Address", addressSchema) {}