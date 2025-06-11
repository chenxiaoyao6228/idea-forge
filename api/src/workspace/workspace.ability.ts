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
      const userPermissions = await this.permissionService.getUserAllPermissions(user.id);

      for (const perm of userPermissions) {
        if (perm.resourceType === ResourceType.WORKSPACE) {
          this.defineWorkspacePermissions(can, perm);
        }
      }
    });
  }

  private defineWorkspacePermissions(can: any, perm: any) {
    switch (perm.permission) {
      case PermissionLevel.OWNER:
        can([Action.Read, Action.Update, Action.Delete, Action.Manage], "Workspace", { id: perm.resourceId });
        can([Action.Manage, Action.InviteMember, Action.RemoveMember], "WorkspaceMember", { workspaceId: perm.resourceId });
        break;
      case PermissionLevel.MANAGE:
        can([Action.Read, Action.Update, Action.Manage], "Workspace", { id: perm.resourceId });
        can([Action.InviteMember], "WorkspaceMember", { workspaceId: perm.resourceId });
        break;
      case PermissionLevel.EDIT:
        can([Action.Read, Action.Update], "Workspace", { id: perm.resourceId });
        can(Action.ViewMembers, "WorkspaceMember", { workspaceId: perm.resourceId });
        break;
      case PermissionLevel.COMMENT:
        can([Action.Read, Action.Comment], "Workspace", { id: perm.resourceId });
        break;
      case PermissionLevel.READ:
        can(Action.Read, "Workspace", { id: perm.resourceId });
        break;
    }
  }
}
