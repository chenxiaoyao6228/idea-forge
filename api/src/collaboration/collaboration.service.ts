import { Injectable, OnModuleInit } from "@nestjs/common";
import { Hocuspocus } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { Throttle } from "@hocuspocus/extension-throttle";
import { Logger } from "@hocuspocus/extension-logger";
import { PrismaService } from "../_shared/database/prisma/prisma.service";

@Injectable()
export class CollaborationService implements OnModuleInit {
  private hocuspocus: Hocuspocus;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    this.hocuspocus = new Hocuspocus({
      port: 5001,
      name: "/collaboration",
      extensions: [
        new Logger(),
        new Throttle({
          throttle: 15,
          banTime: 5,
        }),
        new Database({
          fetch: async ({ documentName }) => {
            const doc = await this.prisma.doc.findUnique({
              where: { id: documentName },
              select: { contentBinary: true },
            });
            return doc?.contentBinary ? new Uint8Array(doc.contentBinary) : null;
          },
          store: async ({ documentName, state }) => {
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
