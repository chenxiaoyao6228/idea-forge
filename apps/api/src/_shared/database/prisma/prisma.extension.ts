import { pagination } from "prisma-extension-pagination";
import { PrismaClient, Prisma } from "@prisma/client";
import { DEFAULT_LIMIT } from "@/_shared/dtos/pager.dto";

export const extendedPrismaClient = (client: PrismaClient) =>
  client
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
          async paginateWithApiFormat<T, A>(this: T, args: A) {
            const { page, limit, ...rest } = args as any;
            const [items, meta] = await (this as any).paginate(rest).withPages({
              page,
              limit,
              includePageCount: true,
            });

            return {
              data: items,
              pagination: {
                page: meta.currentPage,
                limit: limit,
                total: meta.totalCount,
                pageCount: meta.pageCount,
              },
            };
          },
        },
      },
    })
    .$extends(
      pagination({
        cursor: {
          limit: DEFAULT_LIMIT,
          includeTotalCount: true,
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
          includeTotalCount: true,
        },
      }),
    );

export type ExtendedPrismaClient = ReturnType<typeof extendedPrismaClient>;

export type ModelName = Prisma.ModelName;

export type AllModelNames = Prisma.TypeMap["meta"]["modelProps"];

export type ModelFindInput<T extends AllModelNames> = NonNullable<Parameters<PrismaClient[T]["findFirst"]>[0]>;

export type ModelCreateInput<T extends AllModelNames> = NonNullable<Parameters<PrismaClient[T]["create"]>[0]>;

export type ModelInputWhere<T extends AllModelNames> = ModelFindInput<T>["where"];

export type ModelInputData<T extends AllModelNames> = ModelCreateInput<T>["data"];
