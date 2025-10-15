import { Module, forwardRef } from "@nestjs/common";
import { WorkspaceController } from "./workspace.controller";
import { PublicInvitationController } from "./public-invitation.controller";
import { WorkspaceService } from "./workspace.service";
import { SubspaceModule } from "@/subspace/subspace.module";
import { EventsModule } from "@/_shared/events/events.module";
import { PermissionModule } from "@/permission/permission.module";
import { WorkspaceAbility } from "./workspace.ability";
import { NotificationModule } from "@/notification/notification.module";

@Module({
  imports: [SubspaceModule, EventsModule, PermissionModule, forwardRef(() => NotificationModule)],
  controllers: [WorkspaceController, PublicInvitationController],
  providers: [WorkspaceService, WorkspaceAbility],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
