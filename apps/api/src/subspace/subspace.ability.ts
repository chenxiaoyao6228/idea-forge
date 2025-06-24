import { Action, AppAbility, BaseAbility } from "@/_shared/casl/ability.class";
import { DefineAbility } from "@/_shared/casl/ability.decorator";
import { Injectable } from "@nestjs/common";
import { User } from "@idea/contracts";
import { ResourceType, PermissionLevel } from "@prisma/client";
import { PermissionService } from "@/permission/permission.service";
import { ModelName } from "@casl/prisma/dist/types/prismaClientBoundTypes";

@Injectable()
@DefineAbility("Subspace" as ModelName)
export class SubspaceAbility extends BaseAbility {
  constructor(private readonly permissionService: PermissionService) {
    super();
  }

  async createForUser(user: User): Promise<AppAbility> {
    return this.createAbilityAsync(async (builder) => {
      const { can } = builder;
      // Only get permissions related to subspaces
      const subspacePermissions = await this.permissionService.getUserSubspacePermissions(user.id);
      const subspaceIds = subspacePermissions.map((p) => p.resourceId);
      const uniqueSubspaceIds = Array.from(new Set(subspaceIds));

      for (const subspaceId of uniqueSubspaceIds) {
        const level = await this.permissionService.resolveUserPermission(user.id, ResourceType.SUBSPACE, subspaceId);
        this.defineSubspacePermissions(can, subspaceId, level);
      }

      // Still check workspace permissions for creating subspaces
      const workspacePermissions = await this.permissionService.getUserWorkspacePermissions(user.id);
      const workspaceIds = workspacePermissions.map((p) => p.resourceId);
      const uniqueWorkspaceIds = Array.from(new Set(workspaceIds));

      for (const workspaceId of uniqueWorkspaceIds) {
        const level = await this.permissionService.resolveUserPermission(user.id, ResourceType.WORKSPACE, workspaceId);
        this.defineWorkspaceBasedSubspacePermissions(can, workspaceId, level);
      }
    });
  }

  private defineSubspacePermissions(can: any, subspaceId: string, level: PermissionLevel) {
    switch (level) {
      case PermissionLevel.OWNER:
      case PermissionLevel.MANAGE:
        can([Action.Read, Action.Update, Action.Delete, Action.Manage], "Subspace", { id: subspaceId });
        can(Action.ManageMembers, "Subspace", { id: subspaceId });
        can(Action.ViewMembers, "Subspace", { id: subspaceId });
        can(Action.ManagePermissions, "Subspace", { id: subspaceId });
        can(Action.ViewPermissions, "Subspace", { id: subspaceId });
        break;
      case PermissionLevel.EDIT:
        can([Action.Read, Action.Update], "Subspace", { id: subspaceId });
        can(Action.ViewMembers, "Subspace", { id: subspaceId });
        break;
      case PermissionLevel.COMMENT:
        can([Action.Read, Action.Comment], "Subspace", { id: subspaceId });
        break;
      case PermissionLevel.READ:
        can(Action.Read, "Subspace", { id: subspaceId });
        break;
    }
  }

  private defineWorkspaceBasedSubspacePermissions(can: any, workspaceId: string, level: PermissionLevel) {
    if (level === PermissionLevel.OWNER || level === PermissionLevel.MANAGE) {
      can(Action.Create, "Subspace", { workspaceId });
    }
  }
}
