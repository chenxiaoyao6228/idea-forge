import { Injectable } from "@nestjs/common";
import { CreateWorkspaceDto, UpdateWorkspaceDto } from "./workspace.dto";
import { WorkspaceListResponse } from "@idea/contracts";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { SubspaceService } from "@/subspace/subspace.service";
import { presentWorkspace } from "./workspace.presenter";
import fractionalIndex from "fractional-index";
import { PermissionInheritanceService } from "@/permission/permission-inheritance.service";
import { PermissionService } from "@/permission/permission.service";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { ResourceType, WorkspaceRole, WorkspaceMember } from "@idea/contracts";

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly subspaceService: SubspaceService,
    private readonly permissionService: PermissionService,
    private readonly inheritanceService: PermissionInheritanceService,
  ) {}

  /**
   * Initialize a new workspace with default global subspace
   * Creates workspace and sets up initial structure
   */
  async initializeWorkspace(dto: CreateWorkspaceDto, userId: string) {
    const workspace = await this.createWorkspace(dto, userId);
    await this.subspaceService.createDefaultGlobalSubspace(userId, workspace.id);
    return { workspace };
  }

  /**
   * Create a new workspace with the user as owner
   * Automatically assigns workspace permissions and propagates to child resources
   */
  async createWorkspace(dto: CreateWorkspaceDto, userId: string) {
    const workspace = await this.prismaService.workspace.create({
      data: {
        name: dto.name,
        description: dto.description,
        members: {
          create: {
            userId: userId,
            role: WorkspaceRole.OWNER,
          },
        },
      },
    });

    // Assign workspace permissions to creator with full ownership
    const permission = await this.permissionService.assignWorkspacePermissions(userId, workspace.id, WorkspaceRole.OWNER, userId);

    // Propagate permissions to all child resources (subspaces and documents)
    await this.inheritanceService.propagatePermissions(ResourceType.WORKSPACE, workspace.id, permission);

    return presentWorkspace(workspace);
  }

  /**
   * Create default workspace for new users
   * Uses user's email as workspace name
   */
  async CreateDefaultWorkspace(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    return this.createWorkspace(
      {
        name: user.email + "'s Workspace",
        description: "default workspace for user",
        avatar: "",
      },
      userId,
    );
  }

  /**
   * Get all workspaces accessible to the current user
   * Creates default workspace if user has none
   */
  async getUserWorkspaces(currentUserId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: currentUserId },
      include: {
        workspaceMembers: {
          include: {
            workspace: true,
          },
          orderBy: [{ index: "asc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!user) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    if (user.workspaceMembers.length === 0) {
      const workspace = await this.CreateDefaultWorkspace(currentUserId);
      return [presentWorkspace(workspace)];
    }

    const workspaces = user.workspaceMembers.map((member) => member.workspace);
    return workspaces.map(presentWorkspace);
  }

  /**
   * Get detailed workspace information including members and subspaces
   * Validates user access through workspace ability system
   */
  async getWorkspace(workspaceId: string, userId: string) {
    const workspace = await this.prismaService.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, email: true, displayName: true, imageUrl: true },
            },
          },
        },
        subspaces: {
          select: { id: true, name: true, type: true },
        },
        _count: {
          select: { docs: true, members: true },
        },
      },
    });

    if (!workspace) {
      throw new ApiException(ErrorCodeEnum.WorkspaceNotFoundOrNotInWorkspace);
    }

    // Validate user access through unified permission system
    const hasAccess = await this.hasWorkspaceAccess(userId, workspaceId);
    if (!hasAccess) {
      throw new ApiException(ErrorCodeEnum.PermissionDenied);
    }

    return presentWorkspace(workspace);
  }

  /**
   * Get all members of a workspace
   * Requires workspace access permission
   */
  async getWorkspaceMembers(workspaceId: string, userId: string) {
    // Validate user access through workspace ability system
    const hasAccess = await this.hasWorkspaceAccess(userId, workspaceId);
    if (!hasAccess) {
      throw new ApiException(ErrorCodeEnum.PermissionDenied);
    }

    const members = await this.prismaService.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, email: true, displayName: true, imageUrl: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return members;
  }

  /**
   * Get all subspace IDs within a workspace
   * Used for permission cleanup operations
   */
  private async getWorkspaceSubspaceIds(workspaceId: string): Promise<string[]> {
    const subspaces = await this.prismaService.subspace.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    return subspaces.map((s) => s.id);
  }

  /**
   * Get all document IDs within a workspace
   * Used for permission cleanup operations
   */
  private async getWorkspaceDocumentIds(workspaceId: string): Promise<string[]> {
    const docs = await this.prismaService.doc.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    return docs.map((d) => d.id);
  }

  /**
   * Update workspace information
   * Validates update permissions through workspace ability system
   */
  async updateWorkspace(id: string, dto: UpdateWorkspaceDto, userId: string) {
    // Validate user has update permissions through workspace ability
    const hasAccess = await this.hasWorkspaceAccess(userId, id);
    if (!hasAccess) {
      throw new ApiException(ErrorCodeEnum.PermissionDenied);
    }

    const workspace = await this.prismaService.workspace.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        avatar: dto.avatar,
        ...(dto.settings !== undefined && { settings: dto.settings as any }),
      },
    });

    return presentWorkspace(workspace);
  }

  /**
   * Delete workspace and all associated data
   * Only workspace owners can delete, and only if they're the last member
   */
  async deleteWorkspace(id: string, userId: string) {
    // Verify user is workspace owner
    const member = await this.prismaService.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });

    if (!member || member.role !== WorkspaceRole.OWNER) {
      throw new ApiException(ErrorCodeEnum.PermissionDenied);
    }

    // Ensure no other members exist before deletion
    const memberCount = await this.prismaService.workspaceMember.count({
      where: { workspaceId: id },
    });

    if (memberCount > 1) {
      throw new ApiException(ErrorCodeEnum.WorkspaceHasMembers);
    }

    // Clean up all related permissions across workspace hierarchy
    await this.prismaService.unifiedPermission.deleteMany({
      where: {
        OR: [
          { resourceType: ResourceType.WORKSPACE, resourceId: id },
          { resourceType: ResourceType.SUBSPACE, resourceId: { in: await this.getWorkspaceSubspaceIds(id) } },
          { resourceType: ResourceType.DOCUMENT, resourceId: { in: await this.getWorkspaceDocumentIds(id) } },
        ],
      },
    });

    await this.prismaService.workspace.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Add a new member to workspace with specified role
   * Automatically propagates permissions to all child resources
   */
  async addWorkspaceMember(workspaceId: string, userId: string, role: WorkspaceRole, adminId: string) {
    // Verify user is not already a member
    const existingMember = await this.prismaService.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (existingMember) {
      throw new ApiException(ErrorCodeEnum.UserAlreadyInWorkspace);
    }

    // Verify target user exists
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    // 1. Create workspace membership
    const member = await this.prismaService.workspaceMember.create({
      data: { workspaceId, userId, role },
      include: {
        user: {
          select: { id: true, email: true, displayName: true, imageUrl: true },
        },
      },
    });

    // 2. Assign workspace permissions based on role
    const permission = await this.permissionService.assignWorkspacePermissions(userId, workspaceId, role, adminId);

    // 3. Propagate permissions to all child subspaces and documents
    await this.inheritanceService.propagatePermissions(ResourceType.WORKSPACE, workspaceId, permission);

    return member;
  }

  /**
   * Remove a member from workspace
   * Cleans up all associated permissions across the workspace hierarchy
   */
  async removeWorkspaceMember(workspaceId: string, userId: string, adminId: string) {
    // Verify member exists
    const member = await this.prismaService.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!member) {
      throw new ApiException(ErrorCodeEnum.UserNotInWorkspace);
    }

    // Prevent removal of last owner
    if (member.role === WorkspaceRole.OWNER) {
      const ownerCount = await this.prismaService.workspaceMember.count({
        where: { workspaceId, role: WorkspaceRole.OWNER },
      });

      if (ownerCount <= 1) {
        throw new ApiException(ErrorCodeEnum.CannotRemoveLastOwner);
      }
    }

    // 1. Remove membership
    await this.prismaService.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    // 2. Clean up all related permissions across workspace hierarchy
    await this.prismaService.unifiedPermission.deleteMany({
      where: {
        userId,
        OR: [
          { resourceType: ResourceType.WORKSPACE, resourceId: workspaceId },
          { resourceType: ResourceType.SUBSPACE, resourceId: { in: await this.getWorkspaceSubspaceIds(workspaceId) } },
          { resourceType: ResourceType.DOCUMENT, resourceId: { in: await this.getWorkspaceDocumentIds(workspaceId) } },
        ],
      },
    });

    return { success: true };
  }

  /**
   * Check if user has access to workspace
   * Used for basic access validation
   */
  async hasWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
    const workspaceMember = await this.prismaService.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    return !!workspaceMember;
  }

  /**
   * Reorder user's workspaces using fractional indexing
   * Maintains stable ordering without conflicts
   */
  async reorderWorkspaces(workspaceIds: string[], userId: string) {
    // Verify user has access to all workspaces
    for (const workspaceId of workspaceIds) {
      const hasAccess = await this.hasWorkspaceAccess(userId, workspaceId);
      if (!hasAccess) {
        throw new ApiException(ErrorCodeEnum.AuthenticationFailed);
      }
    }

    // Get current workspace members with their indices
    const workspaceMembers = await this.prismaService.workspaceMember.findMany({
      where: {
        userId,
        workspaceId: {
          in: workspaceIds,
        },
      },
      orderBy: { index: "asc" },
    });

    // Update indices using fractional indexing to prevent conflicts
    const updates: Promise<WorkspaceMember>[] = [];
    let lastIndex: string | null = null;

    for (const workspaceId of workspaceIds) {
      const member = workspaceMembers.find((m) => m.workspaceId === workspaceId);
      if (member) {
        const newIndex = fractionalIndex(lastIndex, null);
        updates.push(
          this.prismaService.workspaceMember.update({
            where: { id: member.id },
            data: { index: newIndex },
          }),
        );
        lastIndex = newIndex;
      }
    }

    // Apply all updates in parallel for performance
    await Promise.all(updates);

    return { success: true };
  }

  /**
   * Update workspace member role
   * Automatically updates unified permissions based on new role
   */
  async updateWorkspaceMemberRole(workspaceId: string, userId: string, newRole: WorkspaceRole, adminId: string) {
    // Verify member exists
    const member = await this.prismaService.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!member) {
      throw new ApiException(ErrorCodeEnum.UserNotInWorkspace);
    }

    // Prevent downgrading last owner
    if (member.role === WorkspaceRole.OWNER && newRole !== WorkspaceRole.OWNER) {
      const ownerCount = await this.prismaService.workspaceMember.count({
        where: { workspaceId, role: WorkspaceRole.OWNER },
      });

      if (ownerCount <= 1) {
        throw new ApiException(ErrorCodeEnum.CannotRemoveLastOwner);
      }
    }

    // 1. Update member role
    const updatedMember = await this.prismaService.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { role: newRole },
      include: {
        user: {
          select: { id: true, email: true, displayName: true, imageUrl: true },
        },
      },
    });

    // 2. Update unified permissions based on new role
    const permission = await this.permissionService.assignWorkspacePermissions(userId, workspaceId, newRole, adminId);

    // 3. Propagate permission changes to all child resources
    await this.inheritanceService.propagatePermissions(ResourceType.WORKSPACE, workspaceId, permission);

    return updatedMember;
  }

  // /**
  //  * Invite guest collaborator to specific document
  //  * Creates guest record and assigns document-level permissions
  //  */
  // async inviteGuestCollaborator(workspaceId: string, guestEmail: string, documentId: string, permission: string, inviterId: string) {
  //   // Verify workspace exists and inviter has permission
  //   const hasAccess = await this.hasWorkspaceAccess(inviterId, workspaceId);
  //   if (!hasAccess) {
  //     throw new ApiException(ErrorCodeEnum.PermissionDenied);
  //   }

  //   // Create or update guest collaborator
  //   const guest = await this.prismaService.guestCollaborator.upsert({
  //     where: {
  //       email_workspaceId: {
  //         email: guestEmail,
  //         workspaceId,
  //       },
  //     },
  //     update: {
  //       status: GuestStatus.PENDING,
  //       expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  //     },
  //     create: {
  //       email: guestEmail,
  //       workspaceId,
  //       invitedById: inviterId,
  //       status: GuestStatus.PENDING,
  //       expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  //     },
  //   });

  //   // Assign document permission to guest
  //   await this.prismaService.unifiedPermission.create({
  //     data: {
  //       guestId: guest.id,
  //       resourceType: ResourceType.DOCUMENT,
  //       resourceId: documentId,
  //       permission: permission as PermissionLevel,
  //       sourceType: SourceType.GUEST,
  //       priority: 7,
  //       createdById: inviterId,
  //     },
  //   });

  //   return guest;
  // }

  // /**
  //  * Get all guest collaborators in workspace
  //  * Returns guests with their accessible document count
  //  */
  // async getGuestCollaborators(workspaceId: string, userId: string) {
  //   // Verify user has access to workspace
  //   const hasAccess = await this.hasWorkspaceAccess(userId, workspaceId);
  //   if (!hasAccess) {
  //     throw new ApiException(ErrorCodeEnum.PermissionDenied);
  //   }

  //   const guests = await this.prismaService.guestCollaborator.findMany({
  //     where: { workspaceId },
  //     include: {
  //       invitedBy: {
  //         select: { id: true, email: true, displayName: true },
  //       },
  //       unifiedPermissions: {
  //         select: { resourceId: true, permission: true },
  //       },
  //       _count: {
  //         select: { unifiedPermissions: true },
  //       },
  //     },
  //     orderBy: { createdAt: "desc" },
  //   });

  //   return guests;
  // }

  // /**
  //  * Remove guest collaborator from workspace
  //  * Cleans up all associated permissions
  //  */
  // async removeGuestCollaborator(workspaceId: string, guestId: string, adminId: string) {
  //   // Verify admin has access to workspace
  //   const hasAccess = await this.hasWorkspaceAccess(adminId, workspaceId);
  //   if (!hasAccess) {
  //     throw new ApiException(ErrorCodeEnum.PermissionDenied);
  //   }

  //   // Verify guest exists in this workspace
  //   const guest = await this.prismaService.guestCollaborator.findUnique({
  //     where: { id: guestId },
  //   });

  //   if (!guest || guest.workspaceId !== workspaceId) {
  //     throw new ApiException(ErrorCodeEnum.GuestNotFound);
  //   }

  //   // Remove all guest permissions
  //   await this.prismaService.unifiedPermission.deleteMany({
  //     where: { guestId },
  //   });

  //   // Remove guest collaborator record
  //   await this.prismaService.guestCollaborator.delete({
  //     where: { id: guestId },
  //   });

  //   return { success: true };
  // }

  // /**
  //  * Promote guest collaborator to workspace member
  //  * Migrates guest permissions to user permissions
  //  */
  // async promoteGuestToMember(workspaceId: string, guestId: string, role: WorkspaceRole, adminId: string) {
  //   // Verify admin has access to workspace
  //   const hasAccess = await this.hasWorkspaceAccess(adminId, workspaceId);
  //   if (!hasAccess) {
  //     throw new ApiException(ErrorCodeEnum.PermissionDenied);
  //   }

  //   // Get guest information
  //   const guest = await this.prismaService.guestCollaborator.findUnique({
  //     where: { id: guestId },
  //     include: {
  //       unifiedPermissions: true,
  //     },
  //   });

  //   if (!guest || guest.workspaceId !== workspaceId) {
  //     throw new ApiException(ErrorCodeEnum.GuestNotFound);
  //   }

  //   // Find or create user account for guest email
  //   let user = await this.prismaService.user.findUnique({
  //     where: { email: guest.email },
  //   });

  //   if (!user) {
  //     // Create user account if doesn't exist
  //     user = await this.prismaService.user.create({
  //       data: {
  //         email: guest.email,
  //         displayName: guest.name || guest.email,
  //       },
  //     });
  //   }

  //   // Add user as workspace member
  //   const member = await this.addWorkspaceMember(workspaceId, user.id, role, adminId);

  //   // Migrate guest permissions to user permissions
  //   for (const guestPermission of guest.unifiedPermissions) {
  //     await this.prismaService.unifiedPermission.create({
  //       data: {
  //         userId: user.id,
  //         resourceType: guestPermission.resourceType,
  //         resourceId: guestPermission.resourceId,
  //         permission: guestPermission.permission,
  //         sourceType: SourceType.DIRECT,
  //         priority: 1,
  //         createdById: adminId,
  //       },
  //     });
  //   }

  //   // Remove guest collaborator and their permissions
  //   await this.removeGuestCollaborator(workspaceId, guestId, adminId);

  //   return member;
  // }
}
