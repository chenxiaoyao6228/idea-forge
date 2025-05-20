import { Inject } from "@nestjs/common";
import { pagination } from "prisma-extension-pagination";
import { Prisma, PrismaClient } from "@prisma/client";
import { DEFAULT_LIMIT } from "@/_shared/dtos/pager.dto";

export const PRISMA_CLIENT = Symbol("PRISMA_CLIENT");

export function InjectPrismaClient() {
  return Inject(PRISMA_CLIENT);
}

export function getExtendedPrismaClient({ url }: { url?: string }) {
  const prismaClient = new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
    log: [
      {
        emit: "event",
        level: "query",
      },
    ],
  });

  const extendedPrismaClient = prismaClient
    .$extends({
      result: {},
      model: {
        $allModels: {
          async exists<T, A>(this: T, args: Prisma.Exact<A, Pick<Prisma.Args<T, "findFirst">, "where">>): Promise<boolean> {
            if (typeof args !== "object") return false;

            if (!("where" in args)) return false;

            const count = await (this as any).count({ where: args.where });

            return count > 0;
          },
        },
      },
    })
    .$extends(
      pagination({
        cursor: {
          limit: DEFAULT_LIMIT,
          getCursor({ id }) {
            return id;
          },
          parseCursor(cursor) {
            return {
              id: cursor,
            };
          },
        },
        pages: {
          limit: DEFAULT_LIMIT,
        },
      }),
    );

  return extendedPrismaClient;
}

export type ExtendedPrismaClient = ReturnType<typeof getExtendedPrismaClient>;

export const extendedPrismaClient = getExtendedPrismaClient({ url: process.env.DATABASE_URL });

export type ModelName = Prisma.ModelName;

export type AllModelNames = Prisma.TypeMap["meta"]["modelProps"];

export type ModelFindInput<T extends AllModelNames> = NonNullable<Parameters<ExtendedPrismaClient[T]["findFirst"]>[0]>;

export type ModelCreateInput<T extends AllModelNames> = NonNullable<Parameters<ExtendedPrismaClient[T]["create"]>[0]>;

export type ModelInputWhere<T extends AllModelNames> = ModelFindInput<T>["where"];

export type ModelInputData<T extends AllModelNames> = ModelCreateInput<T>["data"];
