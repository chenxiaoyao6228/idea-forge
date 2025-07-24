import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { GuestStatus, PermissionLevel, ResourceType, SourceType, SubspaceRole, SubspaceType, UnifiedPermission, WorkspaceRole } from "@idea/contracts";
import { PermissionListRequest, SharedWithMeResponse } from "@idea/contracts";

@Injectable()
export class PermissionService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Dynamically resolve a user's permission for a document by traversing the permission inheritance chain.
   * Priority: DIRECT/GROUP (document) > DIRECT/GROUP (subspace) > subspace role > workspace role > guest > none
   */
  async resolveUserPermissionForDocument(userId: string, doc: { id: string; subspaceId?: string | null; workspaceId: string }): Promise<PermissionLevel> {
    // 1. Document level (DIRECT, GROUP)
    const docPerms = await this.prismaService.unifiedPermission.findMany({
      where: {
        userId,
        resourceType: ResourceType.DOCUMENT,
        resourceId: doc.id,
      },
      orderBy: { priority: "asc" },
    });
    if (docPerms.length) return docPerms[0].permission;

    // 2. Subspace level (DIRECT, GROUP, SUBSPACE_ADMIN, SUBSPACE_MEMBER)
    if (doc.subspaceId) {
      const subspacePerms = await this.prismaService.unifiedPermission.findMany({
        where: {
          userId,
          resourceType: ResourceType.SUBSPACE,
          resourceId: doc.subspaceId,
        },
        orderBy: { priority: "asc" },
      });
      if (subspacePerms.length) return this.mapSubspacePermissionToDocumentPermission(subspacePerms[0].permission);
    }

    // 3. Workspace level (DIRECT, GROUP, WORKSPACE_ADMIN, WORKSPACE_MEMBER)
    const wsPerms = await this.prismaService.unifiedPermission.findMany({
      where: {
        userId,
        resourceType: ResourceType.WORKSPACE,
        resourceId: doc.workspaceId,
      },
      orderBy: { priority: "asc" },
    });
    if (wsPerms.length) return this.mapWorkspacePermissionToDocumentPermission(wsPerms[0].permission);

    // 4. Guest/Default
    return PermissionLevel.NONE;
  }

  /**
   * Batch resolve permissions for a list of documents for a user.
   * Returns a map of docId to PermissionLevel.
   */
  async batchResolveUserPermissionsForDocuments(
    userId: string,
    docs: { id: string; subspaceId?: string | null; workspaceId: string }[],
  ): Promise<Record<string, PermissionLevel>> {
    // Preload all relevant permissions in one query for efficiency
    const docIds = docs.map((d) => d.id);
    const subspaceIds = docs.map((d) => d.subspaceId).filter((id): id is string => typeof id === "string" && !!id);
    const workspaceIds = docs.map((d) => d.workspaceId);
    const perms = await this.prismaService.unifiedPermission.findMany({
      where: {
        userId,
        OR: [
          { resourceType: ResourceType.DOCUMENT, resourceId: { in: docIds } },
          { resourceType: ResourceType.SUBSPACE, resourceId: { in: subspaceIds } },
          { resourceType: ResourceType.WORKSPACE, resourceId: { in: workspaceIds } },
        ],
      },
      orderBy: { priority: "asc" },
    });
    // Group permissions by resource
    const docPermMap = new Map<string, UnifiedPermission[]>();
    const subspacePermMap = new Map<string, UnifiedPermission[]>();
    const wsPermMap = new Map<string, UnifiedPermission[]>();
    for (const perm of perms) {
      if (perm.resourceType === ResourceType.DOCUMENT) {
        if (!docPermMap.has(perm.resourceId)) docPermMap.set(perm.resourceId, []);
        docPermMap.get(perm.resourceId)!.push(perm);
      } else if (perm.resourceType === ResourceType.SUBSPACE) {
        if (!subspacePermMap.has(perm.resourceId)) subspacePermMap.set(perm.resourceId, []);
        subspacePermMap.get(perm.resourceId)!.push(perm);
      } else if (perm.resourceType === ResourceType.WORKSPACE) {
        if (!wsPermMap.has(perm.resourceId)) wsPermMap.set(perm.resourceId, []);
        wsPermMap.get(perm.resourceId)!.push(perm);
      }
    }
    const result: Record<string, PermissionLevel> = {};
    for (const doc of docs) {
      // 1. Document level
      const docPerms = docPermMap.get(doc.id) || [];
      if (docPerms.length) {
        result[doc.id] = docPerms[0].permission;
        continue;
      }
      // 2. Subspace level
      if (doc.subspaceId) {
        const subspacePerms = subspacePermMap.get(doc.subspaceId) || [];
        if (subspacePerms.length) {
          result[doc.id] = subspacePerms[0].permission;
          continue;
        }
      }
      // 3. Workspace level
      const wsPerms = wsPermMap.get(doc.workspaceId) || [];
      if (wsPerms.length) {
        result[doc.id] = wsPerms[0].permission;
        continue;
      }
      // 4. Default
      result[doc.id] = PermissionLevel.NONE;
    }
    return result;
  }

  // ================================================================================================================

  // 获取用户所有权限
  async getUserAllPermissions(userId: string): Promise<UnifiedPermission[]> {
    // 获取按优先级排序的权限
    const userPermissions = await this.prismaService.unifiedPermission.findMany({
      where: { userId },
      orderBy: { priority: "asc" },
    });

    return userPermissions;
  }

  async getResourcePermissionAbilities(resourceType: ResourceType, resourceId: string, userId: string) {
    const permissions = await this.prismaService.unifiedPermission.findMany({
      where: { resourceType, resourceId, userId },
      orderBy: { priority: "asc" },
    });
    if (permissions.length === 0) return {};

    if (resourceType === ResourceType.DOCUMENT) {
      const permissionLevel = this.applyPermissionPriority(permissions);
      return this.mapDocPermissionLevelToAbilities(permissionLevel);
    }

    return {};
  }

  async getUserPermissions(userId: string, query: PermissionListRequest) {
    const { page = 1, limit = 10 } = query;

    const { data: permissions, pagination } = await (this.prismaService.unifiedPermission as any).paginateWithApiFormat({
      where: { userId, resourceType: query.resourceType, sourceType: { in: [SourceType.DIRECT] }, createdById: { not: userId } },
      orderBy: { priority: "asc" },
      page,
      limit,
    });

    let data: any[] = [];
    if (query.resourceType === ResourceType.DOCUMENT) {
      data = await this.prismaService.doc.findMany({
        where: { id: { in: permissions.map((permission) => permission.resourceId) } },
      });
    }
    if (query.resourceType === ResourceType.SUBSPACE) {
      data = await this.prismaService.subspace.findMany({
        where: { id: { in: permissions.map((permission) => permission.resourceId) } },
      });
    }

    return {
      pagination,
      data,
      // TODO:
      permissions: {},
    };
  }

  // Usually there are not that many group permissions for user, so we just return all of them
  async getGroupPermissions(adminId: string, query: PermissionListRequest) {
    const { resourceType } = query;
    const groupMembers = await this.prismaService.memberGroupUser.findMany({
      where: { groupId: query.resourceId, userId: adminId },
      include: { user: true },
    });

    const permissions = await this.prismaService.unifiedPermission.findMany({
      where: { userId: { in: groupMembers.map((member) => member.userId) }, resourceType: query.resourceType },
      orderBy: { priority: "asc" },
    });

    let data: any[] = [];
    if (resourceType === ResourceType.DOCUMENT) {
      data = await this.prismaService.doc.findMany({
        where: { id: { in: permissions.map((permission) => permission.resourceId) } },
      });
    }
    if (resourceType === ResourceType.SUBSPACE) {
      data = await this.prismaService.subspace.findMany({
        where: { id: { in: permissions.map((permission) => permission.resourceId) } },
      });
    }

    return {
      data,
      permissions,
    };
  }

  // TODO: remove the below three and merge into one
  async getUserWorkspacePermissions(userId: string) {
    return this.prismaService.unifiedPermission.findMany({
      where: { userId, resourceType: ResourceType.WORKSPACE },
      orderBy: { priority: "asc" },
    });
  }

  async getUserSubspacePermissions(userId: string) {
    return this.prismaService.unifiedPermission.findMany({
      where: { userId, resourceType: ResourceType.SUBSPACE },
      orderBy: { priority: "asc" },
    });
  }

  async getUserDocumentPermissions(userId: string) {
    return this.prismaService.unifiedPermission.findMany({
      where: { userId, resourceType: ResourceType.DOCUMENT },
      orderBy: { priority: "asc" },
    });
  }

  // TODO: 支持 Guest 权限
  async resolveUserPermission(userId: string, resourceType: ResourceType, resourceId: string): Promise<PermissionLevel> {
    const permissions = await this.prismaService.unifiedPermission.findMany({
      where: {
        userId,
        resourceType,
        resourceId,
      },
      orderBy: { priority: "asc" },
    });

    return this.applyPermissionPriority(permissions);
  }

  mapWorkspacePermissionToDocumentPermission(permission: PermissionLevel): PermissionLevel {
    switch (permission) {
      case PermissionLevel.MANAGE:
        return PermissionLevel.OWNER;
      case PermissionLevel.EDIT:
        return PermissionLevel.MANAGE;
      default:
        return PermissionLevel.NONE;
    }
  }

  mapSubspacePermissionToDocumentPermission(permission: PermissionLevel): PermissionLevel {
    switch (permission) {
      case PermissionLevel.MANAGE:
        return PermissionLevel.OWNER;
      case PermissionLevel.EDIT:
        return PermissionLevel.MANAGE;
      default:
        return PermissionLevel.NONE;
    }
  }

  // 权限优先级解析
  private applyPermissionPriority(permissions: UnifiedPermission[]): PermissionLevel {
    if (permissions.length === 0) return PermissionLevel.NONE;

    // 按优先级排序，数字越小优先级越高
    const sortedPermissions = permissions.sort((a, b) => a.priority - b.priority);

    // 返回最高优先级的权限
    return sortedPermissions[0].permission;
  }

  // 分配工作空间权限
  async assignWorkspacePermissions(userId: string, workspaceId: string, role: WorkspaceRole, createdById: string) {
    const permission = this.mapWorkspaceRoleToPermission(role);
    const sourceType = this.mapWorkspaceRoleToSourceType(role);
    const priority = this.getPriorityBySourceType(sourceType);

    return await this.prismaService.unifiedPermission.upsert({
      where: {
        userId_guestId_resourceType_resourceId_sourceType: {
          userId,
          guestId: "",
          resourceType: ResourceType.WORKSPACE,
          resourceId: workspaceId,
          sourceType,
        },
      },
      create: {
        userId,
        resourceType: ResourceType.WORKSPACE,
        resourceId: workspaceId,
        permission,
        sourceType,
        priority,
        createdById,
      },
      update: { permission },
    });
  }

  // 分配子空间权限
  async assignSubspacePermissions(userId: string, subspaceId: string, role: SubspaceRole, createdById: string) {
    const permission = this.mapSubspaceRoleToPermission(role);
    const sourceType = this.mapSubspaceRoleToSourceType(role);
    const priority = this.getPriorityBySourceType(sourceType);

    return await this.prismaService.unifiedPermission.upsert({
      where: {
        userId_guestId_resourceType_resourceId_sourceType: {
          userId,
          guestId: "",
          resourceType: ResourceType.SUBSPACE,
          resourceId: subspaceId,
          sourceType,
        },
      },
      create: {
        userId,
        resourceType: ResourceType.SUBSPACE,
        resourceId: subspaceId,
        permission,
        sourceType,
        priority,
        createdById,
      },
      update: { permission },
    });
  }

  // assign  direct permission to a user
  async assignUserPermission(userId: string, resourceType: ResourceType, resourceId: string, permission: PermissionLevel, createdById: string) {
    const priority = this.getPriorityBySourceType(SourceType.DIRECT);

    return await this.prismaService.unifiedPermission.upsert({
      where: {
        userId_guestId_resourceType_resourceId_sourceType: {
          userId,
          guestId: "",
          resourceType,
          resourceId,
          sourceType: SourceType.DIRECT,
        },
      },
      create: {
        userId,
        resourceType,
        resourceId,
        permission,
        sourceType: SourceType.DIRECT,
        priority,
        createdById,
      },
      update: { permission },
    });
  }

  // assign group permission to a user
  async assignGroupPermissions(groupId: string, resourceType: ResourceType, resourceId: string, permission: PermissionLevel, createdById: string) {
    const groupMembers = await this.prismaService.memberGroupUser.findMany({
      where: { groupId },
      include: { user: true },
    });

    const permissions: UnifiedPermission[] = [];

    for (const member of groupMembers) {
      const groupPermission = await this.prismaService.unifiedPermission.upsert({
        where: {
          userId_guestId_resourceType_resourceId_sourceType: {
            userId: member.userId,
            guestId: "",
            resourceType,
            resourceId,
            sourceType: SourceType.GROUP,
          },
        },
        create: {
          userId: member.userId,
          resourceType,
          resourceId,
          permission,
          sourceType: SourceType.GROUP,
          priority: 2,
          createdById,
        },
        update: { permission },
      });
      permissions.push(groupPermission);
    }

    return permissions;
  }

  // invite guest collaborator
  async inviteGuestCollaborator(docId: string, email: string, permission: PermissionLevel, inviterId: string, expireDays = 30) {
    // get the workspace of the document
    const doc = await this.prismaService.doc.findUnique({
      where: { id: docId },
      select: { workspaceId: true },
    });

    if (!doc) {
      throw new Error("Document not found");
    }

    //  create or update guest collaborator
    const guest = await this.prismaService.guestCollaborator.upsert({
      where: {
        email_workspaceId: {
          email,
          workspaceId: doc.workspaceId,
        },
      },
      create: {
        email,
        workspaceId: doc.workspaceId,
        invitedById: inviterId,
        expireAt: new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000),
        status: GuestStatus.PENDING,
      },
      update: {
        expireAt: new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000),
        status: GuestStatus.ACTIVE,
      },
    });

    // create guest permission
    const guestPermission = await this.prismaService.unifiedPermission.create({
      data: {
        guestId: guest.id,
        resourceType: ResourceType.DOCUMENT,
        resourceId: docId,
        permission,
        sourceType: SourceType.GUEST,
        priority: 7,
        createdById: inviterId,
      },
    });

    return { guest, permission: guestPermission };
  }

  // assign initial permissions based on subspace type
  async assignSubspaceTypePermissions(subspaceId: string, subspaceType: SubspaceType, workspaceId: string, creatorId: string) {
    switch (subspaceType) {
      case SubspaceType.WORKSPACE_WIDE:
        await this.assignWorkspaceWideSubspacePermissions(subspaceId, workspaceId, creatorId);
        break;
      case SubspaceType.PUBLIC:
        await this.assignPublicSubspacePermissions(subspaceId, workspaceId, creatorId);
        break;
      case SubspaceType.INVITE_ONLY:
        await this.assignInviteOnlySubspacePermissions(subspaceId, creatorId);
        break;
      case SubspaceType.PRIVATE:
        await this.assignPrivateSubspacePermissions(subspaceId, creatorId);
        break;
    }
  }

  // assign workspace wide subspace permissions
  private async assignWorkspaceWideSubspacePermissions(subspaceId: string, workspaceId: string, creatorId: string) {
    const workspaceMembers = await this.prismaService.workspaceMember.findMany({
      where: { workspaceId },
    });
    // TODO: 每次都要遍历, 待优化
    for (const member of workspaceMembers) {
      const role = member.userId === creatorId ? SubspaceRole.ADMIN : SubspaceRole.MEMBER;
      await this.assignSubspacePermissions(member.userId, subspaceId, role, creatorId);
    }
  }

  // 公开空间权限分配
  private async assignPublicSubspacePermissions(subspaceId: string, workspaceId: string, creatorId: string) {
    // 创建者为管理员
    await this.assignSubspacePermissions(creatorId, subspaceId, SubspaceRole.ADMIN, creatorId);

    // 其他工作空间成员可以评论
    const workspaceMembers = await this.prismaService.workspaceMember.findMany({
      where: {
        workspaceId,
        userId: { not: creatorId },
      },
    });

    for (const member of workspaceMembers) {
      await this.prismaService.unifiedPermission.create({
        data: {
          userId: member.userId,
          resourceType: ResourceType.SUBSPACE,
          resourceId: subspaceId,
          permission: PermissionLevel.COMMENT,
          sourceType: SourceType.WORKSPACE_MEMBER,
          priority: 6,
          createdById: creatorId,
        },
      });
    }
  }

  // 邀请空间权限分配
  private async assignInviteOnlySubspacePermissions(subspaceId: string, creatorId: string) {
    // 只有创建者有权限
    await this.assignSubspacePermissions(creatorId, subspaceId, SubspaceRole.ADMIN, creatorId);
  }

  // 私有空间权限分配
  private async assignPrivateSubspacePermissions(subspaceId: string, creatorId: string) {
    // 只有创建者有权限
    await this.assignSubspacePermissions(creatorId, subspaceId, SubspaceRole.ADMIN, creatorId);
  }

  // 移除权限
  async removePermission(permissionId: string) {
    return await this.prismaService.unifiedPermission.delete({
      where: { id: permissionId },
    });
  }

  // 更新权限
  async updatePermission(permissionId: string, newPermission: PermissionLevel) {
    return await this.prismaService.unifiedPermission.update({
      where: { id: permissionId },
      data: { permission: newPermission },
    });
  }

  private mapWorkspaceRoleToPermission(role: WorkspaceRole): PermissionLevel {
    switch (role) {
      case WorkspaceRole.OWNER:
        return PermissionLevel.OWNER;
      case WorkspaceRole.ADMIN:
        return PermissionLevel.MANAGE;
      case WorkspaceRole.MEMBER:
        return PermissionLevel.READ;
      default:
        return PermissionLevel.NONE;
    }
  }

  private mapSubspaceRoleToPermission(role: SubspaceRole): PermissionLevel {
    switch (role) {
      case SubspaceRole.ADMIN:
        return PermissionLevel.MANAGE;
      case SubspaceRole.MEMBER:
        return PermissionLevel.EDIT;
      default:
        return PermissionLevel.NONE;
    }
  }

  private mapWorkspaceRoleToSourceType(role: WorkspaceRole): SourceType {
    return role === WorkspaceRole.MEMBER ? SourceType.WORKSPACE_MEMBER : SourceType.WORKSPACE_ADMIN;
  }

  private mapSubspaceRoleToSourceType(role: SubspaceRole): SourceType {
    return role === SubspaceRole.MEMBER ? SourceType.SUBSPACE_MEMBER : SourceType.SUBSPACE_ADMIN;
  }

  mapDocPermissionLevelToAbilities(permissionLevel: PermissionLevel) {
    switch (permissionLevel) {
      case PermissionLevel.OWNER:
      case PermissionLevel.MANAGE:
        return {
          read: true,
          update: true,
          delete: true,
          share: true,
          comment: true,
        };
      case PermissionLevel.EDIT:
        return {
          read: true,
          update: true,
          delete: false,
          share: false,
          comment: true,
        };
      case PermissionLevel.COMMENT:
        return {
          read: true,
          update: false,
          delete: false,
          share: false,
          comment: true,
        };
      case PermissionLevel.READ:
        return {
          read: true,
          update: false,
          delete: false,
          share: false,
          comment: false,
        };
      default:
        return {
          read: false,
          update: false,
          delete: false,
          share: false,
          comment: false,
        };
    }
  }

  getPriorityBySourceType(sourceType: SourceType): number {
    switch (sourceType) {
      case SourceType.DIRECT:
        return 1;
      case SourceType.GROUP:
        return 2;
      case SourceType.SUBSPACE_ADMIN:
        return 3;
      case SourceType.SUBSPACE_MEMBER:
        return 4;
      case SourceType.WORKSPACE_ADMIN:
        return 5;
      case SourceType.WORKSPACE_MEMBER:
        return 6;
      case SourceType.GUEST:
        return 7;
      default:
        return 999;
    }
  }
}
