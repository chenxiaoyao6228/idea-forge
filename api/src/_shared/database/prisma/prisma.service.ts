import { Injectable, type OnModuleInit, type OnModuleDestroy, Global, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Global()
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
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
      this.logger.log("Successfully connected to database");
    } catch (error) {
      this.logger.error("Failed to connect to database", error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log("Successfully disconnected from database");
    } catch (error) {
      this.logger.error("Error disconnecting from database", error);
      throw error;
    }
  }
}
