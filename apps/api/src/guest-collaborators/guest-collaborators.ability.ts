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
@DefineAbility("GuestCollaborator" as ModelName)
export class GuestCollaboratorsAbility extends BaseAbility {
  constructor(private readonly prismaService: PrismaService) {
    super();
  }

  async createForUser(user: UserWithWorkspace, _context?: Record<string, unknown>): Promise<AppAbility> {
    return this.createAbilityAsync(async (builder) => {
      const { can } = builder;

      // Get current workspace from user object
      const currentWorkspaceId = user.currentWorkspaceId || (_context?.workspaceId as string);

      if (currentWorkspaceId) {
        // Get permissions for current workspace only
        const workspaceMember = await this.prismaService.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: currentWorkspaceId,
              userId: user.id,
            },
          },
          select: {
            role: true,
            workspace: {
              select: {
                type: true,
              },
            },
          },
        });

        if (workspaceMember) {
          this.defineGuestCollaboratorPermissions(can, currentWorkspaceId, workspaceMember.role, workspaceMember.workspace.type);
        }
      } else {
        // Fallback: Get permissions for all workspaces
        const workspaceMembers = await this.prismaService.workspaceMember.findMany({
          where: { userId: user.id },
          select: {
            workspaceId: true,
            role: true,
            workspace: {
              select: {
                type: true,
              },
            },
          },
        });

        for (const member of workspaceMembers) {
          this.defineGuestCollaboratorPermissions(can, member.workspaceId, member.role, member.workspace.type);
        }
      }
    });
  }

  private defineGuestCollaboratorPermissions(can: any, workspaceId: string, role: WorkspaceRole, workspaceType: string) {
    switch (role) {
      case WorkspaceRole.OWNER:
      case WorkspaceRole.ADMIN:
        // OWNER/ADMIN: Can manage all guest collaborators
        can([Action.Create, Action.Read, Action.Update, Action.Delete, Action.Manage], "GuestCollaborator", { workspaceId });
        break;

      case WorkspaceRole.MEMBER:
        // MEMBER: Can only read guest collaborators (view-only access)
        can(Action.Read, "GuestCollaborator", { workspaceId });
        break;

      default:
        // No permissions for unknown roles
        break;
    }
  }
}
