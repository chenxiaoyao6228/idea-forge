import { Injectable, OnModuleInit } from "@nestjs/common";
import { Hocuspocus } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { Throttle } from "@hocuspocus/extension-throttle";
import { Logger } from "@hocuspocus/extension-logger";
import { PrismaService } from "../_shared/database/prisma/prisma.service";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class CollaborationService implements OnModuleInit {
  private hocuspocus: Hocuspocus;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    this.hocuspocus = new Hocuspocus({
      port: 5001,
      name: "/collaboration",
      async onConnect(data) {
        // await delay(100000);
        return data;
      },
      async onRequest(data) {
        // await delay(1000);
        return data;
      },
      extensions: [
        new Logger(),
        new Throttle({
          throttle: 15,
          banTime: 5,
        }),
        new Database({
          fetch: async ({ documentName }) => {
            // await delay(100000);
            const doc = await this.prisma.doc.findUnique({
              where: { id: documentName },
              select: { contentBinary: true },
            });
            return doc?.contentBinary ? new Uint8Array(doc.contentBinary) : null;
          },
          store: async ({ documentName, state }) => {
            // await delay(1000);
            await this.prisma.doc.update({
              where: { id: documentName },
              data: { contentBinary: state },
            });
          },
        }),
      ],
    });

    await this.hocuspocus.listen();
  }
}
