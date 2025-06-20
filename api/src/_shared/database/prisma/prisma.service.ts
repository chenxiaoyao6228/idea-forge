import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { pagination } from "prisma-extension-pagination";
import { DEFAULT_LIMIT } from "@/_shared/dtos/pager.dto";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
    this.$extends(
      //see:  https://github.com/deptyped/prisma-extension-pagination
      pagination({
        cursor: {
          limit: DEFAULT_LIMIT,
          getCursor: ({ id }) => id,
          parseCursor: (cursor) => ({ id: cursor }),
        },
        pages: {
          limit: DEFAULT_LIMIT,
        },
      }),
    );
  }
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
