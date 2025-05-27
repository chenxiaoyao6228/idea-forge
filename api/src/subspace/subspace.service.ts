import { Inject, Injectable } from "@nestjs/common";
import { CreateSubspaceDto, UpdateSubspaceDto, AddSubspaceMemberDto, UpdateSubspaceMemberDto } from "./subspace.dto";
import { NavigationNode, NavigationNodeType, SubspaceTypeSchema } from "contracts";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { type ExtendedPrismaClient, PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";

@Injectable()
export class SubspaceService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prismaService: ExtendedPrismaClient) {}

  async createDefaultGlobalSubspace(userId: number, workspaceId: string) {
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

  async createSubspace(dto: CreateSubspaceDto, userId: number) {
    // Check if user is a member of the workspace
    const workspaceMember = await this.prismaService.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: dto.workspaceId,
          userId,
        },
      },
    });

    if (!workspaceMember) {
      throw new ApiException(ErrorCodeEnum.WorkspaceNotFoundOrNotInWorkspace);
    }

    const subspace = await this.prismaService.subspace.create({
      data: {
        name: dto.name,
        description: dto.description,
        avatar: dto.avatar,
        type: dto.type,
        workspace: {
          connect: {
            id: dto.workspaceId,
          },
        },
        members: {
          create: {
            userId,
            role: "ADMIN",
          },
        },
      },
    });

    return {
      ...subspace,
      createdAt: subspace.createdAt.toISOString(),
      updatedAt: subspace.updatedAt.toISOString(),
    };
  }

  async getUserSubWorkspaces(userId: number) {
    const workspaces = await this.prismaService.workspaceMember.findMany({
      where: {
        userId,
      },
      include: {
        workspace: {
          include: {
            subspaces: true,
          },
        },
      },
    });

    return workspaces.flatMap((workspaceMember) =>
      workspaceMember.workspace.subspaces.map((subspace) => ({
        ...subspace,
        createdAt: subspace.createdAt.toISOString(),
        updatedAt: subspace.updatedAt.toISOString(),
      })),
    );
  }

  async getSubspace(id: string, userId: number) {
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
    const isSubspaceMember = subspace.members.some((member) => member.userId === userId);
    const isPublicSubspace = subspace.type === "PUBLIC";

    if (!isWorkspaceMember || (!isSubspaceMember && !isPublicSubspace)) {
      throw new ApiException(ErrorCodeEnum.SubspaceAccessDenied);
    }

    return {
      subspace: {
        ...subspace,
        workspace: undefined,
        members: subspace.members.map((member) => ({
          ...member,
          createdAt: member.createdAt,
        })),
        createdAt: subspace.createdAt,
        updatedAt: subspace.updatedAt,
      },
    };
  }

  async updateSubspace(id: string, dto: UpdateSubspaceDto, userId: number) {
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

    const subspace = await this.prismaService.subspace.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        avatar: dto.avatar,
        type: dto.type,
      },
    });

    return {
      ...subspace,
      createdAt: subspace.createdAt.toISOString(),
      updatedAt: subspace.updatedAt.toISOString(),
    };
  }

  async deleteSubspace(id: string, userId: number) {
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
  async getSubspaceNavigationTree(subspaceId: string, userId: number) {
    // 1. 检查用户是否有访问权限
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

    // 2. 权限检查 - 类似于 authorize(user, "readDocument", collection)
    const isWorkspaceMember = subspace.workspace.members.length > 0;
    const isSubspaceMember = subspace.members.length > 0;
    const isPublicSubspace = subspace.type === "PUBLIC";

    if (!isWorkspaceMember || (!isSubspaceMember && !isPublicSubspace)) {
      throw new ApiException(ErrorCodeEnum.SubspaceAccessDenied);
    }

    // 3. 返回文档结构
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
  // 添加文档到 navigationTree
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
      // 添加到根级别
      navigationTree.unshift(docNode);
    } else {
      // 递归添加到指定父文档下
      const addToParent = (nodes: NavigationNode[]): NavigationNode[] => {
        return nodes.map((node) => {
          if (node.id === parentId) {
            return {
              ...node,
              children: [docNode, ...node.children],
            };
          } else if (node.children.length > 0) {
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

    // 更新数据库
    await this.prismaService.subspace.update({
      where: { id: subspaceId },
      data: {
        navigationTree: navigationTree as any,
      },
    });

    return navigationTree;
  }

  // 从 navigationTree 中移除文档
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

  // 更新 navigationTree 中的文档信息
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
            children: node.children, // 保持原有的子节点
          };
        } else if (node.children.length > 0) {
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

  // ==== members

  async addSubspaceMember(subspaceId: string, dto: AddSubspaceMemberDto, currentUserId: number) {
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
    });

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

  async updateSubspaceMember(subspaceId: string, memberId: string, dto: UpdateSubspaceMemberDto, currentUserId: number) {
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

  async removeSubspaceMember(subspaceId: string, memberId: string, currentUserId: number) {
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

  async getSubspaceMembers(subspaceId: string, userId: number) {
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
}
