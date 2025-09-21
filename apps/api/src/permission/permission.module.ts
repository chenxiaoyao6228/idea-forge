import { Module } from "@nestjs/common";
import { PermissionService } from "./permission.service";
import { PermissionController } from "./permission.controller";
import { EnhancedPermissionService } from "./enhanced-permission.service";
import { SubspacePermissionService } from "./subspace-permission.service";
import { DocumentInheritanceService } from "./document-inheritance.service";
import { PermissionContextService } from "./permission-context.service";
import { PermissionEventService } from "./permission-event.service";
import { PermissionConflictService } from "./permission-conflict.service";
import { PermissionWebsocketService } from "./permission-websocket.service";
import { EventsModule } from "@/_shared/events/events.module";

@Module({
  imports: [EventsModule],
  controllers: [PermissionController],
  providers: [
    PermissionService,
    EnhancedPermissionService,
    SubspacePermissionService,
    DocumentInheritanceService,
    PermissionContextService,
    PermissionEventService,
    PermissionConflictService,
    PermissionWebsocketService,
  ],
  exports: [
    PermissionService,
    EnhancedPermissionService,
    SubspacePermissionService,
    DocumentInheritanceService,
    PermissionContextService,
    PermissionEventService,
    PermissionConflictService,
    PermissionWebsocketService,
  ],
})
export class PermissionModule {}
