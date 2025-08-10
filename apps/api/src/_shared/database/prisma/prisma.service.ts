import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(configService: ConfigService) {
    const databaseUrl = configService.get<string>("DATABASE_URL");

    super({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: [
        {
          emit: "event",
          level: "query",
        },
      ],
    });

    // Log SQL queries
    // @ts-ignore
    this.$on("query", (e: any) => {
      console.log("Query: " + e.query);
      // console.log("Params: " + e.params);
      // console.log("Duration: " + e.duration + "ms");
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
