import { Module } from "@nestjs/common";
import { DocPermissionResolveService } from "./document-permission.service";
import { EventsModule } from "@/_shared/events/events.module";
@Module({
  imports: [EventsModule],
  controllers: [],
  providers: [DocPermissionResolveService],
  exports: [DocPermissionResolveService],
})
export class PermissionModule {}
