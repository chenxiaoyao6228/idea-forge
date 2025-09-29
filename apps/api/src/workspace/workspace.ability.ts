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
  async createForUser(user: UserWithWorkspace, _context?: Record<string, unknown>): Promise<AppAbility> {
    return this.createAbilityAsync(async (builder) => {
      const { can } = builder; // Destructure here instead

      // Get current workspace from user object (now available!)
      const currentWorkspaceId = user.currentWorkspaceId;

      if (currentWorkspaceId) {
        // Get permissions for current workspace only (optimized for workspace switching)
        await this.defineWorkspacePermissionsForUser(can, user.id, currentWorkspaceId);
      } else {
        // Fallback: Get permissions for all workspaces (existing behavior)
        const workspaceMembers = await this.prismaService.workspaceMember.findMany({
          where: { userId: user.id },
          select: {
            workspaceId: true,
            role: true,
            workspace: {
              select: { type: true },
            },
          },
        });

        for (const member of workspaceMembers) {
          this.defineWorkspacePermissions(can, member.workspaceId, member.role, member.workspace.type);
        }

        // Also check for guest permissions
        const userWithEmail = await this.prismaService.user.findUnique({
          where: { id: user.id },
          select: { email: true },
        });

        if (userWithEmail?.email) {
          const guestCollaborators = await this.prismaService.guestCollaborator.findMany({
            where: {
              email: userWithEmail.email,
              expireAt: {
                gt: new Date(), // Only active guest collaborators
              },
            },
            select: { workspaceId: true },
          });

          for (const guest of guestCollaborators) {
            // Grant only read access for guest workspaces
            can(Action.Read, "Workspace", { id: guest.workspaceId });
          }
        }
      }
    });
  }

  private async defineWorkspacePermissionsForUser(can: any, userId: string, workspaceId: string) {
    // First check if user is a member
    const workspaceMember = await this.prismaService.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      select: {
        role: true,
        workspace: {
          select: { type: true },
        },
      },
    });

    if (workspaceMember) {
      this.defineWorkspacePermissions(can, workspaceId, workspaceMember.role, workspaceMember.workspace.type);
      return;
    }

    // If not a member, check if user is a guest collaborator
    const userWithEmail = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (userWithEmail?.email) {
      const guestCollaborator = await this.prismaService.guestCollaborator.findFirst({
        where: {
          workspaceId,
          email: userWithEmail.email,
          expireAt: {
            gt: new Date(), // Only active guest collaborators
          },
        },
      });

      if (guestCollaborator) {
        // Grant only read access for guest workspaces
        can(Action.Read, "Workspace", { id: workspaceId });
      }
    }
  }

  private defineWorkspacePermissions(can: any, workspaceId: string, role: WorkspaceRole, workspaceType: string) {
    switch (role) {
      case WorkspaceRole.OWNER:
        // OWNER: Can delete workspace/transfer ownership/has all ADMIN permissions
        can([Action.Read, Action.Update, Action.Delete, Action.Manage], "Workspace", { id: workspaceId });
        can([Action.ManageMembers, Action.TransferOwnership], "WorkspaceMember", { workspaceId });
        can(Action.ManageSettings, "Workspace", { id: workspaceId });

        // Only grant ManageSubspaces permission for team workspaces
        if (workspaceType === "TEAM") {
          can(Action.ManageSubspaces, "Workspace", { id: workspaceId });
        }
        break;

      case WorkspaceRole.ADMIN:
        // ADMIN: Can manage workspace settings, add/remove members, manage all documents
        can([Action.Read, Action.Update, Action.Manage], "Workspace", { id: workspaceId });
        can(Action.ManageMembers, "WorkspaceMember", { workspaceId });
        can(Action.ManageSettings, "Workspace", { id: workspaceId });

        // Only grant ManageSubspaces permission for team workspaces
        if (workspaceType === "TEAM") {
          can(Action.ManageSubspaces, "Workspace", { id: workspaceId });
        }
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
