import { Action, AppAbility, BaseAbility } from "@/_shared/casl/ability.class";
import { DefineAbility } from "@/_shared/casl/ability.decorator";
import { Injectable } from "@nestjs/common";
import { SubspaceRole } from "@idea/contracts";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { Prisma } from "@prisma/client";

// Extended user interface with subspace context
interface UserWithSubspace {
  id: string;
  currentWorkspaceId?: string | null;
}

@Injectable()
@DefineAbility("Subspace" as Prisma.ModelName)
export class SubspaceAbility extends BaseAbility {
  constructor(private readonly prismaService: PrismaService) {
    super();
  }
  // Will be called on each request that triggers a policy check
  async createForUser(user: UserWithSubspace, _context?: Record<string, unknown>): Promise<AppAbility> {
    return this.createAbilityAsync(async (builder) => {
      const { can } = builder; // Destructure here instead

      // Get current workspace from user object
      const currentWorkspaceId = user.currentWorkspaceId;

      if (currentWorkspaceId) {
        // Get permissions for subspaces in current workspace only (optimized for workspace switching)
        const subspaceMembers = await this.prismaService.subspaceMember.findMany({
          where: {
            userId: user.id,
            subspace: {
              workspaceId: currentWorkspaceId,
            },
          },
          select: {
            subspaceId: true,
            role: true,
            subspace: {
              select: { id: true, workspaceId: true },
            },
          },
        });

        for (const member of subspaceMembers) {
          this.defineSubspacePermissions(can, member.subspaceId, member.role);
        }

        // Also check workspace permissions for creating subspaces
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
          this.defineWorkspaceBasedSubspacePermissions(can, currentWorkspaceId, workspaceMember.role);
        }
      } else {
        // Fallback: Get permissions for all subspaces (existing behavior)
        const subspaceMembers = await this.prismaService.subspaceMember.findMany({
          where: { userId: user.id },
          select: {
            subspaceId: true,
            role: true,
            subspace: {
              select: { id: true, workspaceId: true },
            },
          },
        });

        for (const member of subspaceMembers) {
          this.defineSubspacePermissions(can, member.subspaceId, member.role);
        }

        // Get workspace permissions for creating subspaces
        const workspaceMembers = await this.prismaService.workspaceMember.findMany({
          where: { userId: user.id },
          select: { workspaceId: true, role: true },
        });

        for (const member of workspaceMembers) {
          this.defineWorkspaceBasedSubspacePermissions(can, member.workspaceId, member.role);
        }
      }
    });
  }

  private defineSubspacePermissions(can: any, subspaceId: string, role: SubspaceRole) {
    switch (role) {
      case SubspaceRole.ADMIN:
        // ADMIN: Can manage subspace settings, add/remove members, manage all documents in the subspace
        can([Action.Read, Action.Update, Action.Delete, Action.Manage], "Subspace", { id: subspaceId });
        can([Action.ManageMembers, Action.ViewMembers], "SubspaceMember", { subspaceId });
        can(Action.ManagePermissions, "Subspace", { id: subspaceId });
        can(Action.ManageSettings, "Subspace", { id: subspaceId });
        can(Action.ManageStructure, "Subspace", { id: subspaceId });
        break;

      case SubspaceRole.MEMBER:
        // MEMBER: Can read subspace and manage navigation tree
        can([Action.Read, Action.Update], "Subspace", { id: subspaceId });
        can(Action.ViewMembers, "SubspaceMember", { subspaceId });
        can(Action.ManageStructure, "Subspace", { id: subspaceId });
        break;

      default:
        // No permissions for unknown roles
        break;
    }
  }

  private defineWorkspaceBasedSubspacePermissions(can: any, workspaceId: string, role: any) {
    // Workspace OWNER and ADMIN can create and delete subspaces
    if (role === "OWNER" || role === "ADMIN") {
      can(Action.Create, "Subspace", { workspaceId });
      // Workspace admins can delete any subspace in their workspace
      can(Action.Delete, "Subspace", { workspaceId });
    }
  }
}
