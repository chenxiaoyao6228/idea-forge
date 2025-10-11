import { Module } from "@nestjs/common";
import { PublicShareController } from "./public-share.controller";
import { PublicShareService } from "./public-share.service";
import { PrismaModule } from "@/_shared/database/prisma/prisma.module";
import { DocPermissionResolveService } from "@/permission/document-permission.service";
import { EventsModule } from "@/_shared/events/events.module";

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [PublicShareController],
  providers: [PublicShareService, DocPermissionResolveService],
  exports: [PublicShareService],
})
export class PublicShareModule {}
