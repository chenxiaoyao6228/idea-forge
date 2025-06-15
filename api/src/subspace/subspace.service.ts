import { Inject, Injectable } from "@nestjs/common";
import {
  CreateSubspaceDto,
  UpdateSubspaceDto,
  AddSubspaceMemberDto,
  UpdateSubspaceMemberDto,
} from "./subspace.dto";
import {
  NavigationNode,
  NavigationNodeType,
  SubspaceTypeSchema,
} from "contracts";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import {
  type ExtendedPrismaClient,
  PRISMA_CLIENT,
} from "@/_shared/database/prisma/prisma.extension";
import fractionalIndex from "fractional-index";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";
import { presentSubspace, presentSubspaces } from "./subspace.presenter";
import { BusinessEvents } from "@/_shared/socket/business-event.constant";
import { PermissionService } from "@/permission/permission.service";
import {
  SourceType,
  ResourceType,
  SubspaceType,
  PermissionLevel,
} from "@prisma/client";

@Injectable()
export class SubspaceService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prismaService: ExtendedPrismaClient,
    private readonly eventPublisher: EventPublisherService,
    private readonly permissionService: PermissionService
  ) {}

  async createDefaultGlobalSubspace(userId: string, workspaceId: string) {
    return await this.createSubspace(
      {
        workspaceId,
        name: "Global Space",
        description: "Global subspace",
        avatar: "",
        type: SubspaceTypeSchema.enum.PUBLIC,
      },
      userId
    );
  }

  async createSubspace(dto: CreateSubspaceDto, creatorId: string) {
    // Check if user is a member of the workspace
    const workspaceMember = await this.prismaService.workspaceMember.findUnique(
      {
        where: {
          workspaceId_userId: {
            workspaceId: dto.workspaceId,
            userId: creatorId,
          },
        },
      }
    );

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
    const finalIndex = await this.removeIndexCollision(
      dto.workspaceId,
      newIndex
    );

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

    // Assign subspace type permissions
    // FIXME: ts type optimization
    await this.permissionService.assignSubspaceTypePermissions(
      subspace.id,
      dto.type as SubspaceType,
      dto.workspaceId,
      creatorId
    );

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
    const finalIndex = await this.removeIndexCollision(
      subspace.workspaceId,
      newIndex
    );

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

  private async removeIndexCollision(
    workspaceId: string,
    index: string
  ): Promise<string> {
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

  async getUserSubWorkspaces(userId: string, workspaceId?: string) {
    const workspaces = await this.prismaService.workspaceMember.findMany({
      where: {
        userId,
        ...(workspaceId && { workspaceId }),
      },
      include: {
        workspace: {
          include: {
            subspaces: {
              orderBy: {
                index: "asc",
              },
            },
          },
        },
      },
    });

    return presentSubspaces(
      workspaces.flatMap(
        (workspaceMember) => workspaceMember.workspace.subspaces
      )
    );
  }

  async getSubspace(id: string, userId: string) {
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id },
      include: {
        members: true,
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
    const isSubspaceMember = subspace.members.some(
      (member) => member.userId === userId
    );
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
    // 1. Check if user has access permission
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
      throw new ApiException(ErrorCodeEnum.SubspaceNotFound);
    }

    // 2. Permission check - similar to authorize(user, "readDocument", collection)
    const isWorkspaceMember = subspace.workspace.members.length > 0;
    const isSubspaceMember = subspace.members.length > 0;
    const isPublicSubspace = subspace.type === "PUBLIC";

    if (!isWorkspaceMember || (!isSubspaceMember && !isPublicSubspace)) {
      throw new ApiException(ErrorCodeEnum.SubspaceAccessDenied);
    }

    // 3. Return document structure
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
  async addDocumentToNavigationTree(
    subspaceId: string,
    doc: any,
    parentId?: string
  ) {
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

  async addSubspaceMember(
    subspaceId: string,
    dto: AddSubspaceMemberDto,
    adminId: string
  ) {
    // Check if the user to be added is a member of the workspace
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id: subspaceId },
      select: { workspaceId: true },
    });

    if (!subspace) {
      throw new ApiException(ErrorCodeEnum.SubspaceNotFound);
    }

    const workspaceMember = await this.prismaService.workspaceMember.findUnique(
      {
        where: {
          workspaceId_userId: {
            workspaceId: subspace.workspaceId,
            userId: dto.userId,
          },
        },
      }
    );

    if (!workspaceMember) {
      throw new ApiException(ErrorCodeEnum.UserNotInWorkspace);
    }

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

    return {
      member: {
        ...member,
        createdAt: member.createdAt.toISOString(),
      },
    };
  }

  async updateSubspaceMember(
    subspaceId: string,
    memberId: string,
    dto: UpdateSubspaceMemberDto,
    currentUserId: string
  ) {
    // Check if current user is an admin of the subspace
    const currentUserMember = await this.prismaService.subspaceMember.findFirst(
      {
        where: {
          subspaceId,
          userId: currentUserId,
          role: "ADMIN",
        },
      }
    );

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

  async removeSubspaceMember(
    subspaceId: string,
    memberId: string,
    currentUserId: string
  ) {
    // Check if current user is an admin of the subspace
    const currentUserMember = await this.prismaService.subspaceMember.findFirst(
      {
        where: {
          subspaceId,
          userId: currentUserId,
          role: "ADMIN",
        },
      }
    );

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
    });

    return {
      members: members,
      total: members.length,
    };
  }

  async hasSubspaceAccess(
    userId: string,
    subspaceId: string
  ): Promise<boolean> {
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

  async addUserPermission(
    subspaceId: string,
    targetUserId: string,
    permission: PermissionLevel,
    currentUserId: string
  ) {
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
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    return userPermission;
  }

  async removeUserPermission(
    subspaceId: string,
    targetUserId: string,
    currentUserId: string
  ) {
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

    await this.prismaService.subspaceMemberPermission.delete({
      where: {
        subspaceId_userId: {
          subspaceId,
          userId: targetUserId,
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

    const permissions =
      await this.prismaService.subspaceMemberPermission.findMany({
        where: {
          subspaceId,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
      });

    return {
      data: permissions,
    };
  }

  async addGroupPermission(
    subspaceId: string,
    groupId: string,
    permission: PermissionLevel,
    currentUserId: string
  ) {
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

    // Create or update group permission
    const groupPermission = await this.prismaService.docGroupPermission.upsert({
      where: {
        docId_groupId: {
          docId: subspaceId,
          groupId,
        },
      },
      update: {
        permission,
      },
      create: {
        docId: subspaceId,
        groupId,
        permission,
        userId: currentUserId,
        createdById: currentUserId,
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return groupPermission;
  }

  async removeGroupPermission(
    subspaceId: string,
    groupId: string,
    currentUserId: string
  ) {
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

    await this.prismaService.docGroupPermission.delete({
      where: {
        docId_groupId: {
          docId: subspaceId,
          groupId,
        },
      },
    });

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

    const permissions = await this.prismaService.docGroupPermission.findMany({
      where: {
        docId: subspaceId,
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return {
      data: permissions,
    };
  }
}
