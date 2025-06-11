import { Action, AppAbility, BaseAbility } from "@/_shared/casl/ability.class";
import { DefineAbility } from "@/_shared/casl/ability.decorator";
import { Injectable, Inject } from "@nestjs/common";
import { User } from "contracts";
import { ResourceType, PermissionLevel } from "@prisma/client";
import { PermissionService } from "@/permission/permission.service";

@Injectable()
@DefineAbility("Subspace")
export class SubspaceAbility extends BaseAbility {
  constructor(private readonly permissionService: PermissionService) {
    super();
  }
  // Will be called on each request that triggers a policy check
  async createForUser(user: User): Promise<AppAbility> {
    return this.createAbilityAsync(async ({ can }) => {
      // Get user's all permissions from unified permission system
      const userPermissions = await this.permissionService.getUserAllPermissions(user.id);

      for (const perm of userPermissions) {
        if (perm.resourceType === ResourceType.SUBSPACE) {
          this.defineSubspacePermissions(can, perm);
        }

        // Workspace permissions also grant subspace creation rights
        if (perm.resourceType === ResourceType.WORKSPACE) {
          this.defineWorkspaceBasedSubspacePermissions(can, perm);
        }
      }
    });
  }

  private defineSubspacePermissions(can: any, perm: any) {
    switch (perm.permission) {
      case PermissionLevel.OWNER:
      case PermissionLevel.MANAGE:
        can([Action.Read, Action.Update, Action.Delete, Action.Manage], "Subspace", { id: perm.resourceId });
        can(Action.ManageMembers, "Subspace", { id: perm.resourceId });
        can(Action.ViewMembers, "Subspace", { id: perm.resourceId });
        can(Action.ManagePermissions, "Subspace", { id: perm.resourceId });
        can(Action.ViewPermissions, "Subspace", { id: perm.resourceId });
        break;
      case PermissionLevel.EDIT:
        can([Action.Read, Action.Update], "Subspace", { id: perm.resourceId });
        can(Action.ViewMembers, "Subspace", { id: perm.resourceId });
        break;
      case PermissionLevel.COMMENT:
        can([Action.Read, Action.Comment], "Subspace", { id: perm.resourceId });
        break;
      case PermissionLevel.READ:
        can(Action.Read, "Subspace", { id: perm.resourceId });
        break;
    }
  }

  private defineWorkspaceBasedSubspacePermissions(can: any, perm: any) {
    // Workspace members can create subspaces in their workspace
    if (perm.permission === PermissionLevel.OWNER || perm.permission === PermissionLevel.MANAGE) {
      can(Action.Create, "Subspace", { workspaceId: perm.resourceId });
    }
  }
}
