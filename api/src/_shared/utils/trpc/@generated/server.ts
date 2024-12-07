import { initTRPC } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.create();
const publicProcedure = t.procedure;

const appRouter = t.router({
  dogsRouter: t.router({
    hello: publicProcedure.output(z.string()).query(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any),
    findAll: publicProcedure.output(z.array(z.object({
      name: z.string(),
      breed: z.enum(['Labrador', 'Corgi', 'Beagle', 'Golden Retriver']),
    }))).query(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any),
    createDog: publicProcedure.input(z.object({ name: z.string() })).output(z.object({ message: z.string() })).mutation(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any),
    updateDog: publicProcedure.input(z.object({ name: z.string() })).output(z.object({ message: z.string() })).mutation(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any)
  })
});
export type AppRouter = typeof appRouter;

