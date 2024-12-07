import { Injectable, type OnModuleInit, type OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import chalk from "chalk";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Feel free to change this log threshold to something that makes sense for you
    const logThreshold = 20;

    super({
      log: [
        { level: "query", emit: "event" },
        { level: "error", emit: "stdout" },
        { level: "warn", emit: "stdout" },
      ],
    });

    // this.$on("query", async (e: any) => {
    //   if (e.duration < logThreshold) return;
    //   const color: keyof typeof chalk =
    //     e.duration < logThreshold * 1.1
    //       ? "green"
    //       : e.duration < logThreshold * 1.2
    //         ? "blue"
    //         : e.duration < logThreshold * 1.3
    //           ? "yellow"
    //           : e.duration < logThreshold * 1.4
    //             ? "redBright"
    //             : "red";
    //   const dur = chalk[color](`${e.duration}ms`);
    //   console.info(`prisma:query - ${dur} - ${e.query}`);
    // });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
