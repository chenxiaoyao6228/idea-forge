import { Action, AppAbility, BaseAbility } from "@/_shared/casl/ability.class";
import { DefineAbility } from "@/_shared/casl/ability.decorator";
import { Injectable } from "@nestjs/common";
import { WorkspaceRole } from "@idea/contracts";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { ModelName } from "@casl/prisma/dist/types/prismaClientBoundTypes";

// Extended user interface with workspace context
interface UserWithWorkspace {
  id: string;
  currentWorkspaceId?: string | null;
}

@Injectable()
@DefineAbility("Workspace" as ModelName)
export class WorkspaceAbility extends BaseAbility {
  constructor(private readonly prismaService: PrismaService) {
    super();
  }

  // Will be called on each request that triggers a policy check
  async createForUser(user: UserWithWorkspace): Promise<AppAbility> {
    return this.createAbilityAsync(async (builder) => {
      const { can } = builder; // Destructure here instead

      // Get current workspace from user object (now available!)
      const currentWorkspaceId = user.currentWorkspaceId;

      if (currentWorkspaceId) {
        // Get permissions for current workspace only (optimized for workspace switching)
        const workspaceMember = await this.prismaService.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: currentWorkspaceId,
              userId: user.id,
            },
          },
          select: { role: true },
        });

        if (workspaceMember) {
          this.defineWorkspacePermissions(can, currentWorkspaceId, workspaceMember.role);
        }
      } else {
        // Fallback: Get permissions for all workspaces (existing behavior)
        const workspaceMembers = await this.prismaService.workspaceMember.findMany({
          where: { userId: user.id },
          select: { workspaceId: true, role: true },
        });

        for (const member of workspaceMembers) {
          this.defineWorkspacePermissions(can, member.workspaceId, member.role);
        }
      }
    });
  }

  private defineWorkspacePermissions(can: any, workspaceId: string, role: WorkspaceRole) {
    switch (role) {
      case WorkspaceRole.OWNER:
        // OWNER: Can delete workspace/transfer ownership/has all ADMIN permissions
        can([Action.Read, Action.Update, Action.Delete, Action.Manage], "Workspace", { id: workspaceId });
        can([Action.Manage, Action.InviteMember, Action.RemoveMember, Action.TransferOwnership], "WorkspaceMember", { workspaceId });
        can([Action.ManageWorkspaceSettings, Action.ManageSubspaces], "Workspace", { id: workspaceId });
        break;

      case WorkspaceRole.ADMIN:
        // ADMIN: Can manage workspace settings, add/remove members, manage all documents
        can([Action.Read, Action.Update, Action.Manage], "Workspace", { id: workspaceId });
        can([Action.InviteMember, Action.RemoveMember, Action.ManageMembers], "WorkspaceMember", { workspaceId });
        can([Action.ManageWorkspaceSettings, Action.ManageSubspaces], "Workspace", { id: workspaceId });
        break;

      case WorkspaceRole.MEMBER:
        // MEMBER: Can create documents/join subspaces/create member groups (if allowed)
        can([Action.Read, Action.Update], "Workspace", { id: workspaceId });
        can([Action.ViewMembers], "WorkspaceMember", { workspaceId });
        break;

      default:
        // No permissions for unknown roles
        break;
    }
  }
}
