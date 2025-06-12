import { Action, AppAbility, BaseAbility } from "@/_shared/casl/ability.class";
import { DefineAbility } from "@/_shared/casl/ability.decorator";
import { Injectable } from "@nestjs/common";
import { User } from "contracts";
import { ResourceType, PermissionLevel } from "@prisma/client";
import { PermissionService } from "@/permission/permission.service";
import { ModelName } from "@/_shared/database/prisma/prisma.extension";

@Injectable()
@DefineAbility("Workspace" as ModelName)
export class WorkspaceAbility extends BaseAbility {
  constructor(private readonly permissionService: PermissionService) {
    super();
  }
  // Will be called on each request that triggers a policy check
  async createForUser(user: User): Promise<AppAbility> {
    return this.createAbilityAsync(async (builder) => {
      const { can } = builder; // Destructure here instead
      const workspacePerms = await this.permissionService.getUserWorkspacePermissions(user.id);
      const uniqueWorkspaceIds = Array.from(new Set(workspacePerms.map((p) => p.resourceId)));
      for (const workspaceId of uniqueWorkspaceIds) {
        const level = await this.permissionService.resolveUserPermission(user.id, ResourceType.WORKSPACE, workspaceId);
        this.defineWorkspacePermissions(can, workspaceId, level);
      }
    });
  }

  private defineWorkspacePermissions(can: any, workspaceId: string, level: PermissionLevel) {
    switch (level) {
      case PermissionLevel.OWNER:
        can([Action.Read, Action.Update, Action.Delete, Action.Manage], "Workspace", { id: workspaceId });
        can([Action.Manage, Action.InviteMember, Action.RemoveMember], "WorkspaceMember", { workspaceId });
        break;
      case PermissionLevel.MANAGE:
        can([Action.Read, Action.Update, Action.Manage], "Workspace", { id: workspaceId });
        can([Action.InviteMember], "WorkspaceMember", { workspaceId });
        break;
      case PermissionLevel.EDIT:
        can([Action.Read, Action.Update], "Workspace", { id: workspaceId });
        can(Action.ViewMembers, "WorkspaceMember", { workspaceId });
        break;
      case PermissionLevel.COMMENT:
        can([Action.Read, Action.Comment], "Workspace", { id: workspaceId });
        break;
      case PermissionLevel.READ:
        can(Action.Read, "Workspace", { id: workspaceId });
        break;
    }
  }
}
