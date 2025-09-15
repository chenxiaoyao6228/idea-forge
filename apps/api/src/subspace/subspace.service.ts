import { Injectable } from "@nestjs/common";
import { CreateSubspaceDto, UpdateSubspaceDto, AddSubspaceMemberDto, UpdateSubspaceMemberDto, UpdateSubspaceSettingsDto } from "./subspace.dto";
import { Subspace, SubspaceTypeSchema, SubspaceSettingsResponse, UpdateSubspaceSettingsRequest } from "@idea/contracts";
import { NavigationNode, NavigationNodeType } from "@idea/contracts";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import fractionalIndex from "fractional-index";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";
import { presentSubspace, presentSubspaceMember, presentSubspaces } from "./subspace.presenter";
import { BusinessEvents } from "@/_shared/socket/business-event.constant";
import { PermissionService } from "@/permission/permission.service";
import { SourceType, ResourceType, SubspaceType, PermissionLevel } from "@idea/contracts";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";

@Injectable()
export class SubspaceService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly eventPublisher: EventPublisherService,
    private readonly permissionService: PermissionService,
  ) {}

  async joinSubspace(subspaceId: string, userId: string) {
    // Validate subspace
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id: subspaceId },
      select: {
        id: true,
        type: true,
        workspaceId: true,
        members: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    if (!subspace) {
      throw new ApiException(ErrorCodeEnum.SubspaceNotFound);
    }

    // Cannot join personal/private/invite-only via self-join
    if (subspace.type === SubspaceType.PERSONAL || subspace.type === SubspaceType.PRIVATE || subspace.type === SubspaceType.INVITE_ONLY) {
      throw new ApiException(ErrorCodeEnum.SubspaceAccessDenied);
    }

    // Must be a workspace member
    const workspaceMember = await this.prismaService.workspaceMember.findFirst({
      where: { workspaceId: subspace.workspaceId, userId },
      select: { id: true },
    });
    if (!workspaceMember) {
      throw new ApiException(ErrorCodeEnum.UserNotInWorkspace);
    }

    // Already a member
    if (subspace.members.length > 0) {
      return { success: true };
    }

    // Create membership
    await this.prismaService.subspaceMember.create({
      data: {
        subspaceId,
        userId,
        role: "MEMBER",
      },
    });

    // Emit event
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.SUBSPACE_MEMBER_ADDED,
      workspaceId: subspace.workspaceId,
      actorId: userId,
      data: {
        subspaceId,
        userId,
        role: "MEMBER",
      },
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }

  async createDefaultGlobalSubspace(userId: string, workspaceId: string) {
    return await this.createSubspace(
      {
        workspaceId,
        name: "Global Space",
        description: "Global subspace",
        avatar: "",
        type: SubspaceTypeSchema.enum.PUBLIC,
      },
      userId,
    );
  }

  async createPersonalSubspace(userId: string, workspaceId: string) {
    // Check if personal subspace already exists for this user
    const existingPersonalSubspace = await this.prismaService.subspace.findFirst({
      where: {
        workspaceId,
        type: SubspaceType.PERSONAL,
        members: {
          some: {
            userId,
          },
        },
      },
    });

    if (existingPersonalSubspace) {
      return existingPersonalSubspace;
    }

    // Create personal subspace
    const personalSubspace = await this.prismaService.subspace.create({
      data: {
        name: "My Docs",
        description: "Personal documents for this workspace member",
        type: SubspaceType.PERSONAL,
        workspaceId,
        navigationTree: [],
        members: {
          create: {
            userId,
            role: "ADMIN",
          },
        },
      },
    });

    // Assign permissions
    await this.permissionService.assignSubspacePermissions(userId, personalSubspace.id, "ADMIN", userId);

    return personalSubspace;
  }

  async removePersonalSubspacesForUser(userId: string, workspaceId: string) {
    // Find all personal subspaces in this workspace that belong to the user
    const personalSubspaces = await this.prismaService.subspace.findMany({
      where: {
        workspaceId,
        type: SubspaceType.PERSONAL,
        members: {
          some: {
            userId,
          },
        },
      },
      select: { id: true },
    });

    if (personalSubspaces.length === 0) {
      return;
    }

    const personalSubspaceIds = personalSubspaces.map((s) => s.id);

    // Delete all subspace members for these subspaces
    await this.prismaService.subspaceMember.deleteMany({
      where: {
        subspaceId: { in: personalSubspaceIds },
      },
    });

    // Delete the subspaces themselves
    await this.prismaService.subspace.deleteMany({
      where: {
        id: { in: personalSubspaceIds },
      },
    });
  }

  async createSubspace(dto: CreateSubspaceDto, creatorId: string) {
    // Check if user is a member of the workspace
    const workspaceMember = await this.prismaService.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: dto.workspaceId,
          userId: creatorId,
        },
      },
    });

    if (!workspaceMember) {
      throw new ApiException(ErrorCodeEnum.WorkspaceNotFoundOrNotInWorkspace);
    }

    // Get the first subspace's index to generate new index
    const firstSubspace = await this.prismaService.subspace.findFirst({
      where: {
        workspaceId: dto.workspaceId,
        index: { not: null }, // Only include subspaces with index set
      },
      orderBy: {
        index: "asc", // This will sort lexicographically which works for fractional indices
      },
    });

    // Generate new index
    const newIndex = fractionalIndex(null, firstSubspace?.index ?? null);

    // Handle possible index collision
    const finalIndex = await this.removeIndexCollision(dto.workspaceId, newIndex);

    const subspace = await this.prismaService.subspace.create({
      data: {
        name: dto.name,
        description: dto.description,
        avatar: dto.avatar,
        type: dto.type,
        index: finalIndex,
        workspace: {
          connect: {
            id: dto.workspaceId,
          },
        },
        members: {
          create: {
            userId: creatorId,
            role: "ADMIN",
          },
        },
      },
    });

    // If subspace is WORKSPACE_WIDE, add all workspace members automatically
    if (dto.type === SubspaceType.WORKSPACE_WIDE) {
      const workspaceMembers = await this.prismaService.workspaceMember.findMany({
        where: { workspaceId: dto.workspaceId },
        select: { userId: true },
      });

      // Create subspace member records for all workspace members
      await this.prismaService.subspaceMember.createMany({
        data: workspaceMembers.map(({ userId }) => ({
          subspaceId: subspace.id,
          userId,
          role: "MEMBER",
        })),
        skipDuplicates: true, // Avoid duplicate for creator who is already ADMIN
      });

      // Assign subspace permissions for each member (keep creator as ADMIN)
      await Promise.all(
        workspaceMembers.map(({ userId }) =>
          this.permissionService.assignSubspacePermissions(userId, subspace.id, userId === creatorId ? "ADMIN" : "MEMBER", creatorId),
        ),
      );
    }

    // Assign subspace type permissions
    // FIXME: ts type optimization
    await this.permissionService.assignSubspaceTypePermissions(subspace.id, dto.type as SubspaceType, dto.workspaceId, creatorId);

    // Emit create event
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.SUBSPACE_CREATE,
      workspaceId: dto.workspaceId,
      actorId: creatorId.toString(),
      data: {
        subspace: presentSubspace(subspace),
      },
      timestamp: new Date().toISOString(),
    });

    return presentSubspace(subspace);
  }

  async moveSubspace(id: string, newIndex: string, userId: string) {
    const subspaceMember = await this.prismaService.subspaceMember.findFirst({
      where: {
        subspaceId: id,
        userId,
        // role: "ADMIN", // TODO:
      },
    });

    if (!subspaceMember) {
      throw new ApiException(ErrorCodeEnum.SubspaceAdminRoleRequired);
    }

    const subspace = await this.prismaService.subspace.findUnique({
      where: { id },
    });

    if (!subspace) {
      throw new ApiException(ErrorCodeEnum.SubspaceNotFound);
    }

    // handle index collision
    const finalIndex = await this.removeIndexCollision(subspace.workspaceId, newIndex);

    const updatedSubspace = await this.prismaService.subspace.update({
      where: { id },
      data: { index: finalIndex },
    });

    // Emit move event
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.SUBSPACE_MOVE,
      workspaceId: updatedSubspace.workspaceId,
      actorId: userId.toString(),
      data: {
        subspaceId: id,
        index: finalIndex,
        updatedAt: updatedSubspace.updatedAt,
      },
      timestamp: new Date().toISOString(),
    });

    return {
      index: updatedSubspace.index,
    };
  }

  async leaveSubspace(subspaceId: string, userId: string) {
    // check if the subspace exists
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id: subspaceId },
      select: {
        id: true,
        type: true,
        members: {
          where: { userId },
          select: { id: true, role: true },
        },
        workspace: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!subspace) {
      throw new ApiException(ErrorCodeEnum.SubspaceNotFound);
    }

    // check if the user is a member of the subspace
    const userMember = subspace.members[0];
    if (!userMember) {
      throw new ApiException(ErrorCodeEnum.UserNotInSubspace);
    }

    // check if the subspace is a personal subspace (personal subspaces cannot be left)
    if (subspace.type === SubspaceType.PERSONAL) {
      throw new ApiException(ErrorCodeEnum.CannotLeavePersonalSubspace);
    }

    // check if the user is the last admin
    if (userMember.role === "ADMIN") {
      const adminCount = await this.prismaService.subspaceMember.count({
        where: {
          subspaceId,
          role: "ADMIN",
        },
      });

      if (adminCount === 1) {
        throw new ApiException(ErrorCodeEnum.CannotLeaveAsLastAdmin);
      }
    }

    // Delete member record
    await this.prismaService.subspaceMember.delete({
      where: { id: userMember.id },
    });

    // Delete related permissions
    await this.prismaService.unifiedPermission.deleteMany({
      where: {
        userId,
        resourceType: ResourceType.SUBSPACE,
        resourceId: subspaceId,
      },
    });

    // Publish WebSocket event to notify other users
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.SUBSPACE_MEMBER_LEFT,
      workspaceId: subspace.workspace.id,
      actorId: userId,
      data: {
        subspaceId,
        userId,
        memberLeft: true,
      },
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }

  async archiveSubspace(id: string, userId: string) {
    // Check admin permissions (similar to delete)
    const subspaceMember = await this.prismaService.subspaceMember.findFirst({
      where: { subspaceId: id, userId, role: "ADMIN" },
    });

    if (!subspaceMember) {
      throw new ApiException(ErrorCodeEnum.SubspaceAdminRoleRequired);
    }

    const archivedSubspace = await this.prismaService.subspace.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    // Emit archive event
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.SUBSPACE_ARCHIVE,
      workspaceId: archivedSubspace.workspaceId,
      actorId: userId,
      data: { subspaceId: id, archivedAt: archivedSubspace.archivedAt },
      timestamp: new Date().toISOString(),
    });

    return {
      subspace: presentSubspace(archivedSubspace),
    };
  }

  async restoreSubspace(id: string, userId: string) {
    // Check admin permissions (similar to delete)
    const subspaceMember = await this.prismaService.subspaceMember.findFirst({
      where: { subspaceId: id, userId, role: "ADMIN" },
    });

    if (!subspaceMember) {
      throw new ApiException(ErrorCodeEnum.SubspaceAdminRoleRequired);
    }

    const restoredSubspace = await this.prismaService.subspace.update({
      where: { id },
      data: { archivedAt: null },
    });

    // Emit restore event
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.SUBSPACE_RESTORE,
      workspaceId: restoredSubspace.workspaceId,
      actorId: userId,
      data: { subspaceId: id, archivedAt: null },
      timestamp: new Date().toISOString(),
    });

    return {
      subspace: presentSubspace(restoredSubspace),
    };
  }

  private async removeIndexCollision(workspaceId: string, index: string): Promise<string> {
    const existingSubspace = await this.prismaService.subspace.findFirst({
      where: {
        workspaceId,
        index,
      },
    });

    if (!existingSubspace) {
      return index;
    }

    const nextSubspace = await this.prismaService.subspace.findFirst({
      where: {
        workspaceId,
        index: {
          gt: index,
        },
      },
      orderBy: {
        index: "asc",
      },
    });

    const nextIndex = nextSubspace?.index || null;
    return fractionalIndex(index, nextIndex);
  }

  async getUserJoinedSubspacesIncludingPersonal(userId: string, workspaceId: string) {
    // Fetch all subspaces in the workspace, but filter personal subspaces to only include those owned by the user
    const subspaces = await this.prismaService.subspace.findMany({
      where: {
        workspaceId,
        archivedAt: null, // Only include non-archived subspaces
        OR: [
          // Include all non-personal subspaces
          { type: { not: SubspaceType.PERSONAL } },
          // Include personal subspaces only if the user is a member
          {
            type: SubspaceType.PERSONAL,
            members: {
              some: {
                userId: userId,
              },
            },
          },
        ],
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
                imageUrl: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: { index: "asc" },
    });
    return subspaces.map((s) => ({
      ...s,
      memberCount: s._count.members,
    }));
  }

  async getAllSubspacesInWorkspace(workspaceId: string, userId: string) {
    // check if the user is a member of the workspace
    const isWorkspaceMember = await this.prismaService.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });

    if (!isWorkspaceMember) {
      throw new ApiException(ErrorCodeEnum.UserNotInWorkspace);
    }

    const subspaces = await this.prismaService.subspace.findMany({
      where: {
        workspaceId,
        archivedAt: null, // Only include non-archived subspaces
        OR: [
          // Include all non-private subspaces (PUBLIC, WORKSPACE_WIDE, INVITE_ONLY)
          { type: { not: SubspaceType.PRIVATE } },
          // Include private subspaces only if the user is a member
          {
            type: SubspaceType.PRIVATE,
            members: {
              some: {
                userId: userId,
              },
            },
          },
        ],
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
                imageUrl: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: { index: "asc" },
    });
    return subspaces.map((s) => ({
      ...s,
      memberCount: s._count.members,
    }));
  }

  async getSubspace(id: string, userId: string) {
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        workspace: {
          include: {
            members: {
              where: {
                userId,
              },
            },
          },
        },
      },
    });

    if (!subspace) {
      throw new ApiException(ErrorCodeEnum.SubspaceNotFound);
    }

    // Check if user has access to this subspace
    const isWorkspaceMember = subspace.workspace.members.length > 0;
    const isSubspaceMember = subspace.members.some((member) => member.userId === userId);
    const isPublicSubspace = subspace.type === "PUBLIC";

    if (!isWorkspaceMember || (!isSubspaceMember && !isPublicSubspace)) {
      throw new ApiException(ErrorCodeEnum.SubspaceAccessDenied);
    }

    const { workspace, ...subspaceData } = subspace;

    return {
      subspace: {
        ...presentSubspace(subspaceData),
        members: subspace.members.map((member) => ({
          ...member,
          createdAt: member.createdAt,
        })),
        memberCount: subspace.members.length,
      },
    };
  }

  async updateSubspace(id: string, dto: UpdateSubspaceDto, userId: string) {
    // Check if user is an admin of the subspace
    const subspaceMember = await this.prismaService.subspaceMember.findFirst({
      where: {
        subspaceId: id,
        userId,
        // role: "ADMIN",
      },
    });

    if (!subspaceMember) {
      throw new ApiException(ErrorCodeEnum.SubspaceAdminRoleRequired);
    }

    const subspace = await this.prismaService.subspace.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        avatar: dto.avatar,
        type: dto.type,
      },
    });

    // Emit update event
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.SUBSPACE_UPDATE,
      workspaceId: subspace.workspaceId,
      actorId: userId.toString(),
      data: {
        subspace: presentSubspace(subspace),
      },
      timestamp: new Date().toISOString(),
    });

    return presentSubspace(subspace);
  }

  async deleteSubspace(id: string, userId: string) {
    // Check if user is an admin of the subspace
    const subspaceMember = await this.prismaService.subspaceMember.findFirst({
      where: {
        subspaceId: id,
        userId,
        role: "ADMIN",
      },
    });

    if (!subspaceMember) {
      throw new ApiException(ErrorCodeEnum.SubspaceAdminRoleRequired);
    }

    await this.prismaService.subspace.delete({ where: { id } });
    return { success: true };
  }

  // ==== navigationTree ====
  async getSubspaceNavigationTree(subspaceId: string, userId: string) {
    // 1. Fetch subspace with ownerId and isVirtual
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id: subspaceId },
      include: {
        members: {
          where: { userId },
        },
        workspace: {
          include: {
            members: { where: { userId } },
          },
        },
      },
    });

    if (!subspace) {
      throw new ApiException(ErrorCodeEnum.SubspaceNotFound);
    }

    if (subspace.type === SubspaceType.PERSONAL) {
      const isOwner = subspace.members.some((m) => m.userId === userId);
      if (!isOwner) {
        throw new ApiException(ErrorCodeEnum.SubspaceAccessDenied);
      }
      return subspace.navigationTree || [];
    }

    // 3. Regular subspace: permission check
    const isWorkspaceMember = subspace.workspace.members.length > 0;
    const isSubspaceMember = subspace.members.length > 0;
    const isPublicSubspace = subspace.type === "PUBLIC";

    if (!isWorkspaceMember || (!isSubspaceMember && !isPublicSubspace)) {
      throw new ApiException(ErrorCodeEnum.SubspaceAccessDenied);
    }

    // 4. Return document structure
    return subspace.navigationTree || [];
  }

  private docToNavigationNode(doc: any): NavigationNode {
    return {
      type: NavigationNodeType.Document,
      subspaceId: doc.subspaceId,
      id: doc.id,
      title: doc.title,
      url: `/${doc.id}`,
      icon: doc.icon,
      parent: null,
      children: [],
      // isDraft: !doc.publishedAt,
    };
  }

  // Add document to navigation tree
  async addDocumentToNavigationTree(subspaceId: string, doc: any, parentId?: string) {
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id: subspaceId },
    });

    if (!subspace) {
      throw new ApiException(ErrorCodeEnum.SubspaceNotFound);
    }

    let navigationTree = (subspace.navigationTree as NavigationNode[]) || [];
    const docNode = this.docToNavigationNode(doc);

    if (!parentId) {
      // Add to root level
      navigationTree.unshift(docNode);
    } else {
      // Add to specific parent recursively
      const addToParent = (nodes: NavigationNode[]): NavigationNode[] => {
        return nodes.map((node) => {
          if (node.id === parentId) {
            return {
              ...node,
              children: [docNode, ...node.children],
            };
          }

          if (node.children.length > 0) {
            return {
              ...node,
              children: addToParent(node.children),
            };
          }
          return node;
        });
      };

      navigationTree = addToParent(navigationTree);
    }

    await this.prismaService.subspace.update({
      where: { id: subspaceId },
      data: {
        navigationTree: navigationTree as any,
      },
    });

    return navigationTree;
  }

  // Remove document from navigation tree
  async removeDocumentFromNavigationTree(subspaceId: string, docId: string) {
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id: subspaceId },
    });

    if (!subspace) {
      return;
    }

    let navigationTree = (subspace.navigationTree as NavigationNode[]) || [];

    const removeFromTree = (nodes: NavigationNode[]): NavigationNode[] => {
      return nodes
        .filter((node) => node.id !== docId)
        .map((node) => ({
          ...node,
          children: removeFromTree(node.children),
        }));
    };

    navigationTree = removeFromTree(navigationTree);

    await this.prismaService.subspace.update({
      where: { id: subspaceId },
      data: {
        navigationTree: navigationTree as any,
      },
    });
  }

  // Update document in navigation tree
  async updateDocumentInNavigationTree(subspaceId: string, doc: any) {
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id: subspaceId },
    });

    if (!subspace) {
      return;
    }

    let navigationTree = (subspace.navigationTree as NavigationNode[]) || [];
    const updatedNode = this.docToNavigationNode(doc);

    const updateInTree = (nodes: NavigationNode[]): NavigationNode[] => {
      return nodes.map((node) => {
        if (node.id === doc.id) {
          return {
            ...updatedNode,
            children: node.children, // Keep the original child nodes
          };
        }

        if (node.children.length > 0) {
          return {
            ...node,
            children: updateInTree(node.children),
          };
        }
        return node;
      });
    };

    navigationTree = updateInTree(navigationTree);

    await this.prismaService.subspace.update({
      where: { id: subspaceId },
      data: {
        navigationTree: navigationTree as any,
      },
    });
  }

  // ==== Member Management ====

  async addSubspaceMember(subspaceId: string, dto: AddSubspaceMemberDto, adminId: string) {
    // Check if the user to be added is a member of the workspace
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id: subspaceId },
      select: { workspaceId: true },
    });

    if (!subspace) {
      throw new ApiException(ErrorCodeEnum.SubspaceNotFound);
    }

    const workspaceMember = await this.prismaService.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: subspace.workspaceId,
          userId: dto.userId,
        },
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    if (!workspaceMember) {
      throw new ApiException(ErrorCodeEnum.UserNotInWorkspace);
    }

    //  Publish WebSocket event to notify about member addition
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.SUBSPACE_MEMBER_ADDED,
      workspaceId: subspace.workspaceId,
      actorId: adminId,
      data: {
        subspaceId,
        userId: dto.userId,
        role: dto.role,
        member: workspaceMember,
      },
      timestamp: new Date().toISOString(),
    });

    // Check if the user is already a member of the subspace
    const existingMember = await this.prismaService.subspaceMember.findFirst({
      where: {
        subspaceId,
        userId: dto.userId,
      },
    });

    if (existingMember) {
      throw new ApiException(ErrorCodeEnum.UserAlreadyInSubspace);
    }

    const member = await this.prismaService.subspaceMember.create({
      data: {
        subspaceId,
        userId: dto.userId,
        role: dto.role,
      },
    });

    // Only assign subspace-level permission
    await this.permissionService.assignSubspacePermissions(dto.userId, subspaceId, dto.role, adminId);

    return {
      member: {
        ...member,
        createdAt: member.createdAt.toISOString(),
      },
    };
  }

  async batchAddSubspaceMembers(subspaceId: string, dto: any, adminId: string) {
    // Check if the current user is an admin of the subspace
    const currentUserMember = await this.prismaService.subspaceMember.findFirst({
      where: {
        subspaceId,
        userId: adminId,
        role: "ADMIN",
      },
    });

    if (!currentUserMember) {
      throw new ApiException(ErrorCodeEnum.SubspaceAdminRoleRequired);
    }

    // Get subspace workspace ID
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id: subspaceId },
      select: { workspaceId: true },
    });

    if (!subspace) {
      throw new ApiException(ErrorCodeEnum.SubspaceNotFound);
    }

    const results = {
      success: true,
      addedCount: 0,
      errors: [] as Array<{ id: string; type: string; error: string }>,
    };

    // Track successfully added users and groups for batch WebSocket notification
    const addedUsers: Array<{ userId: string; role: string; member: any }> = [];
    const addedGroups: Array<{ groupId: string; members: any[] }> = [];

    // Process each item
    for (const item of dto.items) {
      try {
        if (item.type === "user") {
          // Add user to subspace
          const member = await this.prismaService.subspaceMember.create({
            data: {
              subspaceId,
              userId: item.id,
              role: item.role,
            },
          });

          // Assign permissions
          await this.permissionService.assignSubspacePermissions(item.id, subspaceId, item.role, adminId);

          // Track for batch notification
          addedUsers.push({
            userId: item.id,
            role: item.role,
            member: presentSubspaceMember(member),
          });

          results.addedCount++;
        } else if (item.type === "group") {
          // Implement group member addition
          const group = await this.prismaService.memberGroup.findUnique({
            where: { id: item.id },
            include: {
              members: {
                include: {
                  user: true,
                },
              },
            },
          });

          if (!group) {
            results.errors.push({
              id: item.id,
              type: "group",
              error: "Group not found",
            });
            continue;
          }

          // Check if group is in the same workspace
          if (group.workspaceId !== subspace.workspaceId) {
            results.errors.push({
              id: item.id,
              type: "group",
              error: "Group not in same workspace",
            });
            continue;
          }

          const groupAddedMembers: any[] = [];

          // Add all group members to subspace
          for (const groupMember of group.members) {
            const userId = groupMember.user.id;

            // Check if user is already a subspace member
            const existingMember = await this.prismaService.subspaceMember.findFirst({
              where: {
                subspaceId,
                userId,
              },
            });

            if (!existingMember) {
              const member = await this.prismaService.subspaceMember.create({
                data: {
                  subspaceId,
                  userId,
                  role: item.role || "MEMBER",
                },
              });

              const memberWithUser = await this.prismaService.subspaceMember.findUnique({
                where: { id: member.id },
                include: {
                  user: true,
                },
              });

              // Assign permissions
              await this.permissionService.assignSubspacePermissions(userId, subspaceId, item.role || "MEMBER", adminId);

              groupAddedMembers.push(memberWithUser);

              results.addedCount++;
            }
          }

          if (groupAddedMembers.length > 0) {
            addedGroups.push({
              groupId: item.id,
              members: groupAddedMembers,
            });
          }
        }
      } catch (error) {
        results.errors.push({
          id: item.id,
          type: item.type,
          error: (error as Error).message || "Unknown error",
        });
      }
    }

    // Send single batch WebSocket notification instead of individual ones
    if (addedUsers.length > 0 || addedGroups.length > 0) {
      await this.eventPublisher.publishWebsocketEvent({
        name: BusinessEvents.SUBSPACE_MEMBERS_BATCH_ADDED,
        workspaceId: subspace.workspaceId,
        actorId: adminId,
        data: {
          subspaceId,
          addedUsers,
          addedGroups,
          totalAdded: results.addedCount,
        },
        timestamp: new Date().toISOString(),
      });
    }

    if (results.addedCount === 0 && results.errors.length > 0) {
      results.success = false;
    }

    return results;
  }

  async updateSubspaceMember(subspaceId: string, memberId: string, dto: UpdateSubspaceMemberDto, currentUserId: string) {
    // Check if current user is an admin of the subspace
    const currentUserMember = await this.prismaService.subspaceMember.findFirst({
      where: {
        subspaceId,
        userId: currentUserId,
        role: "ADMIN",
      },
    });

    if (!currentUserMember) {
      throw new ApiException(ErrorCodeEnum.SubspaceAdminRoleRequired);
    }

    const member = await this.prismaService.subspaceMember.update({
      where: { id: memberId },
      data: {
        role: dto.role,
      },
    });

    return {
      member: {
        ...member,
        createdAt: member.createdAt.toISOString(),
      },
    };
  }

  async removeSubspaceMember(subspaceId: string, memberId: string, currentUserId: string) {
    // Check if current user is an admin of the subspace
    const currentUserMember = await this.prismaService.subspaceMember.findFirst({
      where: {
        subspaceId,
        userId: currentUserId,
        role: "ADMIN",
      },
    });

    if (!currentUserMember) {
      throw new ApiException(ErrorCodeEnum.SubspaceAdminRoleRequired);
    }

    await this.prismaService.subspaceMember.delete({
      where: { id: memberId },
    });

    return { success: true };
  }

  async getSubspaceMembers(subspaceId: string, userId: string) {
    // Check if user has access to this subspace
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id: subspaceId },
      include: {
        members: {
          where: {
            userId,
          },
        },
      },
    });

    if (!subspace) {
      throw new ApiException(ErrorCodeEnum.SubspaceNotFound);
    }

    const isSubspaceMember = subspace.members.length > 0;
    const isPublicSubspace = subspace.type === "PUBLIC";

    if (!isSubspaceMember && !isPublicSubspace) {
      throw new ApiException(ErrorCodeEnum.SubspaceAccessDenied);
    }

    const members = await this.prismaService.subspaceMember.findMany({
      where: { subspaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            imageUrl: true,
          },
        },
      },
    });

    return {
      members: members,
      total: members.length,
    };
  }

  async hasSubspaceAccess(userId: string, subspaceId: string): Promise<boolean> {
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id: subspaceId },
      include: {
        members: {
          where: {
            userId,
          },
        },
        workspace: {
          include: {
            members: {
              where: {
                userId,
              },
            },
          },
        },
      },
    });

    if (!subspace) {
      return false;
    }

    // Check if user is a workspace member
    const isWorkspaceMember = subspace.workspace.members.length > 0;
    if (!isWorkspaceMember) {
      return false;
    }

    // Check if user is a subspace member or if subspace is public
    const isSubspaceMember = subspace.members.length > 0;
    const isPublicSubspace = subspace.type === "PUBLIC";

    return isSubspaceMember || isPublicSubspace;
  }

  // ==== permissions ====

  async addUserPermission(subspaceId: string, targetUserId: string, permission: PermissionLevel, currentUserId: string) {
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id: subspaceId },
      include: {
        members: {
          where: {
            userId: currentUserId,
            role: "ADMIN",
          },
        },
      },
    });

    if (!subspace) {
      throw new ApiException(ErrorCodeEnum.SubspaceNotFound);
    }

    if (subspace.members.length === 0) {
      throw new ApiException(ErrorCodeEnum.SubspaceAdminRoleRequired);
    }

    // Check if target user exists
    const targetUser = await this.prismaService.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    // Create or update user permission
    const userPermission = await this.prismaService.unifiedPermission.upsert({
      where: {
        userId_guestId_resourceType_resourceId_sourceType: {
          userId: targetUserId,
          guestId: "",
          resourceType: ResourceType.SUBSPACE,
          resourceId: subspaceId,
          sourceType: SourceType.DIRECT,
        },
      },
      update: {
        permission,
      },
      create: {
        userId: targetUserId,
        guestId: "",
        resourceType: ResourceType.SUBSPACE,
        resourceId: subspaceId,
        sourceType: SourceType.DIRECT,
        permission,
        priority: 2,
        createdById: currentUserId,
      },
      include: {},
    });

    return userPermission;
  }

  async removeUserPermission(subspaceId: string, targetUserId: string, currentUserId: string) {
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id: subspaceId },
      include: {
        members: {
          where: {
            userId: currentUserId,
            role: "ADMIN",
          },
        },
      },
    });

    if (!subspace) {
      throw new ApiException(ErrorCodeEnum.SubspaceNotFound);
    }

    if (subspace.members.length === 0) {
      throw new ApiException(ErrorCodeEnum.SubspaceAdminRoleRequired);
    }

    await this.prismaService.unifiedPermission.delete({
      where: {
        userId_guestId_resourceType_resourceId_sourceType: {
          userId: targetUserId,
          guestId: "",
          resourceType: ResourceType.SUBSPACE,
          resourceId: subspaceId,
          sourceType: SourceType.DIRECT,
        },
      },
    });

    return { success: true };
  }

  async listUserPermissions(subspaceId: string, currentUserId: string) {
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id: subspaceId },
      include: {
        members: {
          where: {
            userId: currentUserId,
          },
        },
      },
    });

    if (!subspace) {
      throw new ApiException(ErrorCodeEnum.SubspaceNotFound);
    }

    const isSubspaceMember = subspace.members.length > 0;
    const isPublicSubspace = subspace.type === "PUBLIC";

    if (!isSubspaceMember && !isPublicSubspace) {
      throw new ApiException(ErrorCodeEnum.SubspaceAccessDenied);
    }

    // TODO:
    const permissions = {};

    return {
      data: permissions,
    };
  }

  async addGroupPermission(subspaceId: string, groupId: string, permission: PermissionLevel, currentUserId: string) {
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id: subspaceId },
      include: {
        members: {
          where: {
            userId: currentUserId,
            role: "ADMIN",
          },
        },
      },
    });

    if (!subspace) {
      throw new ApiException(ErrorCodeEnum.SubspaceNotFound);
    }

    if (subspace.members.length === 0) {
      throw new ApiException(ErrorCodeEnum.SubspaceAdminRoleRequired);
    }

    // Check if group exists
    const group = await this.prismaService.memberGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new ApiException(ErrorCodeEnum.GroupNotFound);
    }

    // TODO:
    const permissions = {};

    return {
      data: permissions,
    };
  }

  async removeGroupPermission(subspaceId: string, groupId: string, currentUserId: string) {
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id: subspaceId },
      include: {
        members: {
          where: {
            userId: currentUserId,
            role: "ADMIN",
          },
        },
      },
    });

    if (!subspace) {
      throw new ApiException(ErrorCodeEnum.SubspaceNotFound);
    }

    if (subspace.members.length === 0) {
      throw new ApiException(ErrorCodeEnum.SubspaceAdminRoleRequired);
    }

    // await this.prismaService.docGroupPermission.delete({
    //   where: {
    //     docId_groupId: {
    //       docId: subspaceId,
    //       groupId,
    //     },
    //   },
    // });

    return { success: true };
  }

  async listGroupPermissions(subspaceId: string, currentUserId: string) {
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id: subspaceId },
      include: {
        members: {
          where: {
            userId: currentUserId,
          },
        },
      },
    });

    if (!subspace) {
      throw new ApiException(ErrorCodeEnum.SubspaceNotFound);
    }

    const isSubspaceMember = subspace.members.length > 0;
    const isPublicSubspace = subspace.type === "PUBLIC";

    if (!isSubspaceMember && !isPublicSubspace) {
      throw new ApiException(ErrorCodeEnum.SubspaceAccessDenied);
    }

    // TODO:
    const permissions = {};

    return {
      data: permissions,
    };
  }

  async batchSetWorkspaceWide(subspaceIds: string[], userId: string) {
    // Get the first subspace to check workspace and permissions
    const firstSubspace = await this.prismaService.subspace.findUnique({
      where: { id: subspaceIds[0] },
      include: { workspace: true },
    });

    if (!firstSubspace) {
      throw new ApiException(ErrorCodeEnum.SubspaceNotFound);
    }

    const workspaceId = firstSubspace.workspaceId;

    // Check if user is workspace admin
    const workspaceMember = await this.prismaService.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!workspaceMember || (workspaceMember.role !== "ADMIN" && workspaceMember.role !== "OWNER")) {
      throw new ApiException(ErrorCodeEnum.PermissionDenied);
    }

    // Get all workspace members
    const workspaceMembers = await this.prismaService.workspaceMember.findMany({
      where: { workspaceId },
      select: { userId: true },
    });

    const workspaceMemberIds = workspaceMembers.map((m) => m.userId);

    // Update all subspaces to WORKSPACE_WIDE and add all workspace members
    const updatedSubspaces = await this.prismaService.$transaction(async (tx) => {
      const subspaces = await tx.subspace.findMany({
        where: {
          id: { in: subspaceIds },
          workspaceId,
        },
      });

      if (subspaces.length !== subspaceIds.length) {
        throw new ApiException(ErrorCodeEnum.SubspaceNotFound);
      }

      const updatedSubspaces: Subspace[] = [];

      for (const subspace of subspaces) {
        // Update subspace type to WORKSPACE_WIDE
        const updatedSubspace = await tx.subspace.update({
          where: { id: subspace.id },
          data: { type: "WORKSPACE_WIDE" },
        });

        // Add all workspace members to this subspace if they're not already members
        for (const memberId of workspaceMemberIds) {
          await tx.subspaceMember.upsert({
            where: {
              subspaceId_userId: {
                subspaceId: subspace.id,
                userId: memberId,
              },
            },
            update: {},
            create: {
              subspaceId: subspace.id,
              userId: memberId,
              role: "MEMBER",
            },
          });
        }

        updatedSubspaces.push(updatedSubspace);
      }

      return updatedSubspaces;
    });

    // TODO: update document permissions

    // Publish events for each updated subspace
    // for (const subspace of updatedSubspaces) {
    //   this.eventPublisher.publish(BusinessEvents.SUBSPACE_UPDATED, {
    //     subspaceId: subspace.id,
    //     workspaceId,
    //     updatedBy: userId,
    //   });
    // }

    return {
      success: true,
      updatedCount: updatedSubspaces.length,
      subspaces: presentSubspaces(updatedSubspaces),
    };
  }

  /**
   * Get complete subspace settings including permissions
   */
  async getSubspaceSettings(subspaceId: string, currentUserId: string): Promise<SubspaceSettingsResponse> {
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id: subspaceId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
                imageUrl: true,
              },
            },
          },
        },
        workspace: {
          include: {
            members: {
              where: { userId: currentUserId },
            },
          },
        },
      },
    });

    if (!subspace) {
      throw new ApiException(ErrorCodeEnum.SubspaceNotFound);
    }

    // Check if user has access to this subspace
    const isSubspaceMember = subspace.members.some((member) => member.userId === currentUserId);
    const isWorkspaceMember = subspace.workspace.members.length > 0;
    const isPublicSubspace = subspace.type === "PUBLIC";

    if (!isSubspaceMember && !isWorkspaceMember && !isPublicSubspace) {
      throw new ApiException(ErrorCodeEnum.SubspaceAccessDenied);
    }

    // Get user permissions
    const userPermission = await this.permissionService.resolveUserPermission(currentUserId, ResourceType.SUBSPACE, subspaceId);

    const isSubspaceAdmin = subspace.members.find((member) => member.userId === currentUserId)?.role === "ADMIN";
    const isWorkspaceAdmin = subspace.workspace.members[0]?.role === "ADMIN" || subspace.workspace.members[0]?.role === "OWNER";

    const permissions = {
      canEditSettings: isSubspaceAdmin || isWorkspaceAdmin || userPermission === PermissionLevel.MANAGE || userPermission === PermissionLevel.OWNER,
      canManageMembers: isSubspaceAdmin || isWorkspaceAdmin || userPermission === PermissionLevel.MANAGE || userPermission === PermissionLevel.OWNER,
      canChangeType: isWorkspaceAdmin || userPermission === PermissionLevel.OWNER,
      canManageSecurity: isSubspaceAdmin || isWorkspaceAdmin || userPermission === PermissionLevel.MANAGE || userPermission === PermissionLevel.OWNER,
    };

    return {
      subspace: {
        ...subspace,
        members: subspace.members.map((member) => ({
          ...member,
          user: member.user,
        })),
        memberCount: subspace.members.length,
        // Include role-based permission settings
        subspaceAdminPermission: subspace.subspaceAdminPermission,
        subspaceMemberPermission: subspace.subspaceMemberPermission,
        nonSubspaceMemberPermission: subspace.nonSubspaceMemberPermission,
      } as any,
      permissions,
    };
  }

  /**
   * Update subspace settings
   */
  async updateSubspaceSettings(subspaceId: string, settings: UpdateSubspaceSettingsRequest, currentUserId: string): Promise<SubspaceSettingsResponse> {
    // First validate access
    const currentSettings = await this.getSubspaceSettings(subspaceId, currentUserId);

    if (!currentSettings.permissions.canEditSettings) {
      throw new ApiException(ErrorCodeEnum.SubspaceAccessDenied);
    }

    // Validate type change permissions
    if (settings.type && !currentSettings.permissions.canChangeType) {
      throw new ApiException(ErrorCodeEnum.SubspaceAccessDenied);
    }

    // Auto-set initial permissions based on subspace type if type is being changed
    let permissionUpdates = {};
    if (settings.type) {
      permissionUpdates = this.getInitialPermissionsForSubspaceType(settings.type);
    }

    // Update the subspace
    const updatedSubspace = await this.prismaService.subspace.update({
      where: { id: subspaceId },
      data: {
        ...(settings.name && { name: settings.name }),
        ...(settings.description !== undefined && { description: settings.description }),
        ...(settings.avatar !== undefined && { avatar: settings.avatar }),
        ...(settings.type && { type: settings.type }),
        ...(settings.allowPublicSharing !== undefined && { allowPublicSharing: settings.allowPublicSharing }),
        ...(settings.allowGuestCollaborators !== undefined && { allowGuestCollaborators: settings.allowGuestCollaborators }),
        ...(settings.allowExport !== undefined && { allowExport: settings.allowExport }),
        ...(settings.allowMemberInvites !== undefined && { allowMemberInvites: settings.allowMemberInvites }),
        ...(settings.allowTopLevelEdit !== undefined && { allowTopLevelEdit: settings.allowTopLevelEdit }),
        ...(settings.memberInvitePermission && { memberInvitePermission: settings.memberInvitePermission }),
        ...(settings.topLevelEditPermission && { topLevelEditPermission: settings.topLevelEditPermission }),
        // Handle role-based permission updates
        ...(settings.subspaceAdminPermission && { subspaceAdminPermission: settings.subspaceAdminPermission }),
        ...(settings.subspaceMemberPermission && { subspaceMemberPermission: settings.subspaceMemberPermission }),
        ...(settings.nonSubspaceMemberPermission && { nonSubspaceMemberPermission: settings.nonSubspaceMemberPermission }),
        // Apply auto-set permissions based on subspace type
        ...permissionUpdates,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
                imageUrl: true,
              },
            },
          },
        },
        workspace: {
          include: {
            members: {
              where: { userId: currentUserId },
            },
          },
        },
      },
    });

    // Publish event for real-time updates
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.SUBSPACE_UPDATE,
      workspaceId: updatedSubspace.workspaceId,
      actorId: currentUserId,
      data: {
        subspaceId,
        changes: settings,
      },
      timestamp: new Date().toISOString(),
    });

    // Return updated settings
    return this.getSubspaceSettings(subspaceId, currentUserId);
  }

  /**
   * Validate user access to subspace settings
   */
  async validateSubspaceSettingsAccess(subspaceId: string, currentUserId: string): Promise<boolean> {
    try {
      const settings = await this.getSubspaceSettings(subspaceId, currentUserId);
      return settings.permissions.canEditSettings;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get initial permissions based on subspace type
   */
  private getInitialPermissionsForSubspaceType(subspaceType: SubspaceType): Partial<{
    subspaceAdminPermission: PermissionLevel;
    subspaceMemberPermission: PermissionLevel;
    nonSubspaceMemberPermission: PermissionLevel;
  }> {
    switch (subspaceType) {
      case "WORKSPACE_WIDE":
        return {
          subspaceAdminPermission: PermissionLevel.OWNER,
          subspaceMemberPermission: PermissionLevel.OWNER,
          // Non-subspace member permissions are not applicable for WORKSPACE_WIDE
        };
      case "PUBLIC":
        return {
          subspaceAdminPermission: PermissionLevel.OWNER,
          subspaceMemberPermission: PermissionLevel.OWNER,
          nonSubspaceMemberPermission: PermissionLevel.COMMENT,
        };
      case "INVITE_ONLY":
        return {
          subspaceAdminPermission: PermissionLevel.OWNER,
          subspaceMemberPermission: PermissionLevel.OWNER,
          nonSubspaceMemberPermission: PermissionLevel.NONE,
        };
      case "PRIVATE":
        return {
          subspaceAdminPermission: PermissionLevel.OWNER,
          subspaceMemberPermission: PermissionLevel.OWNER,
          nonSubspaceMemberPermission: PermissionLevel.NONE,
        };
      default:
        return {};
    }
  }
}
