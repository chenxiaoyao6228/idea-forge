import { Injectable, type OnModuleInit, type OnModuleDestroy, Global, Inject } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Global()
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {
    super({
      log: [
        { level: "query", emit: "event" },
        { level: "error", emit: "stdout" },
        { level: "warn", emit: "stdout" },
      ],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.info("Successfully connected to database");
    } catch (error) {
      this.logger.error("Failed to connect to database", error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.info("Successfully disconnected from database");
    } catch (error) {
      this.logger.error("Error disconnecting from database", error);
      throw error;
    }
  }
}
