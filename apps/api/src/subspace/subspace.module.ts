import { Module } from "@nestjs/common";
import { SubspaceController } from "./subspace.controller";
import { SubspaceService } from "./subspace.service";
import { EventsModule } from "@/_shared/events/events.module";
import { PermissionModule } from "@/permission/permission.module";
import { NotificationModule } from "@/notification/notification.module";
import { SubspaceAbility } from "./subspace.ability";

@Module({
  imports: [EventsModule, PermissionModule, NotificationModule],
  controllers: [SubspaceController],
  providers: [SubspaceService, SubspaceAbility],
  exports: [SubspaceService],
})
export class SubspaceModule {}
