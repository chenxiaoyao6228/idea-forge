import { DynamicModule } from "@nestjs/common";
import { ClsModule } from "nestjs-cls";
import { ClsPluginTransactional } from "@nestjs-cls/transactional";
import { TransactionalAdapterPrisma } from "@nestjs-cls/transactional-adapter-prisma";
import { PrismaModule } from "../database/prisma/prisma.module";
import { generateUuid } from "./uuid";
import { PrismaService } from "../database/prisma/prisma.service";

export class SharedClsModule {
  static forRoot(): DynamicModule {
    return ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (req: Request) => req.headers["x-request-id"] ?? generateUuid(),
      },
      plugins: [
        // see: https://papooch.github.io/nestjs-cls/plugins/available-plugins/transactional
        new ClsPluginTransactional({
          imports: [PrismaModule],
          adapter: new TransactionalAdapterPrisma({
            prismaInjectionToken: PrismaService,
          }),
        }),
      ],
    });
  }
}
