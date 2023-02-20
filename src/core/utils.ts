import z from "myzod";

export type Constructor<Instance, Arguments extends any[] = any[]> = {
  new (...args: Arguments): Instance;
};

// eslint-disable-next-line @typescript-eslint/ban-types
export type Compute<A> = A extends Function ? A : { [K in keyof A]: A[K] } & unknown;

export const positiveIntegerSchema = z
  .number()
  .min(0)
  .withPredicate(n => parseInt(n.toString(), 10) === n);
export const percentageSchema = z.number().min(0).max(100);
export const appVersionSchema = z.string().min(1);
