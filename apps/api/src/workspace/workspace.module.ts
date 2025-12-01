import { Module, forwardRef } from "@nestjs/common";
import { WorkspaceController } from "./workspace.controller";
import { PublicInvitationController } from "./public-invitation.controller";
import { WorkspaceAIConfigController } from "./workspace-ai-config.controller";
import { WorkspaceService } from "./workspace.service";
import { WorkspaceAIConfigService } from "./workspace-ai-config.service";
import { SubspaceModule } from "@/subspace/subspace.module";
import { EventsModule } from "@/_shared/events/events.module";
import { PermissionModule } from "@/permission/permission.module";
import { WorkspaceAbility } from "./workspace.ability";
import { NotificationModule } from "@/notification/notification.module";
import { EncryptionService } from "@/_shared/utils/encryption.service";

@Module({
  imports: [SubspaceModule, EventsModule, PermissionModule, forwardRef(() => NotificationModule)],
  controllers: [WorkspaceController, PublicInvitationController, WorkspaceAIConfigController],
  providers: [WorkspaceService, WorkspaceAIConfigService, WorkspaceAbility, EncryptionService],
  exports: [WorkspaceService, WorkspaceAIConfigService],
})
export class WorkspaceModule {}
