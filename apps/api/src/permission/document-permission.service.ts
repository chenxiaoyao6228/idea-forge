import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { GuestStatus, PermissionLevel, PermissionInheritanceType, SubspaceRole, SubspaceType, DocumentPermission, WorkspaceRole } from "@idea/contracts";
import { PermissionListRequest, SharedWithMeResponse } from "@idea/contracts";

@Injectable()
export class DocPermissionResolveService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Dynamically resolve a user's permission for a document by traversing the permission inheritance chain.
   * Priority: DIRECT/GROUP (document) > DIRECT/GROUP (subspace) > subspace role > workspace role > guest > none
   */
  async resolveUserPermissionForDocument(userId: string, doc: { id: string; subspaceId?: string | null; workspaceId: string }): Promise<PermissionLevel> {
    // 1. Document level (DIRECT, GROUP)
    const docPerms = await this.prismaService.documentPermission.findMany({
      where: {
        userId,
        docId: doc.id,
      },
      orderBy: { priority: "asc" },
    });
    if (docPerms.length) return docPerms[0].permission;

    // 2. Subspace level (DIRECT, GROUP, SUBSPACE_ADMIN, SUBSPACE_MEMBER)
    if (doc.subspaceId) {
      const subspacePerms = await this.prismaService.documentPermission.findMany({
        where: {
          userId,
          docId: doc.subspaceId,
        },
        orderBy: { priority: "asc" },
      });
      if (subspacePerms.length) return this.mapSubspacePermissionToDocumentPermission(subspacePerms[0].permission);
    }

    // 3. Workspace level (DIRECT, GROUP, WORKSPACE_ADMIN, WORKSPACE_MEMBER)
    const wsPerms = await this.prismaService.documentPermission.findMany({
      where: {
        userId,
        docId: doc.workspaceId,
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
    const perms = await this.prismaService.documentPermission.findMany({
      where: {
        userId,
        OR: [{ docId: { in: docIds } }, { docId: { in: subspaceIds } }, { docId: { in: workspaceIds } }],
      },
      orderBy: { priority: "asc" },
    });
    // Group permissions by resource
    const docPermMap = new Map<string, DocumentPermission[]>();
    const subspacePermMap = new Map<string, DocumentPermission[]>();
    const wsPermMap = new Map<string, DocumentPermission[]>();
    for (const perm of perms) {
      const doc = docs.find((d) => d.id === perm.docId);
      if (doc && perm.docId === doc.id) {
        if (!docPermMap.has(perm.docId)) docPermMap.set(perm.docId, []);
        docPermMap.get(perm.docId)!.push(perm);
      } else if (doc && perm.docId === doc.subspaceId) {
        if (!subspacePermMap.has(perm.docId)) subspacePermMap.set(perm.docId, []);
        subspacePermMap.get(perm.docId)!.push(perm);
      } else if (doc && perm.docId === doc.workspaceId) {
        if (!wsPermMap.has(perm.docId)) wsPermMap.set(perm.docId, []);
        wsPermMap.get(perm.docId)!.push(perm);
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

  async getResourcePermissionAbilities(docId: string, userId: string) {
    const permissions = await this.prismaService.documentPermission.findMany({
      where: { docId, userId },
      orderBy: { priority: "asc" },
    });
    if (permissions.length === 0) return {};

    if (docId === "DOCUMENT") {
      const permissionLevel = this.applyPermissionPriority(permissions);
      return this.mapDocPermissionLevelToAbilities(permissionLevel);
    }

    return {};
  }

  async getUserPermissions(userId: string, query: PermissionListRequest) {
    const { page = 1, limit = 10 } = query;

    const { data: permissions, pagination } = await (this.prismaService.documentPermission as any).paginateWithApiFormat({
      where: {
        userId,
        docId: query.docId,
        inheritedFromType: { in: [PermissionInheritanceType.DIRECT] },
        createdById: { not: userId },
      },
      orderBy: { priority: "asc" },
      page,
      limit,
    });

    let data: any[] = [];
    if (query.docId === "DOCUMENT") {
      data = await this.prismaService.doc.findMany({
        where: { id: { in: permissions.map((permission) => permission.docId) } },
      });
    }
    if (query.docId === "SUBSPACE") {
      data = await this.prismaService.subspace.findMany({
        where: { id: { in: permissions.map((permission) => permission.docId) } },
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
    const { docId } = query;
    const groupMembers = await this.prismaService.memberGroupUser.findMany({
      where: { groupId: query.docId, userId: adminId },
      include: { user: true },
    });

    const permissions = await this.prismaService.documentPermission.findMany({
      where: { userId: { in: groupMembers.map((member) => member.userId) } },
      orderBy: { priority: "asc" },
    });

    let data: any[] = [];
    if (docId === "DOCUMENT") {
      data = await this.prismaService.doc.findMany({
        where: { id: { in: permissions.map((permission) => permission.docId) } },
      });
    }
    if (docId === "SUBSPACE") {
      data = await this.prismaService.subspace.findMany({
        where: { id: { in: permissions.map((permission) => permission.docId) } },
      });
    }

    return {
      data,
      permissions,
    };
  }

  async getUserDocumentPermissions(userId: string) {
    return this.prismaService.documentPermission.findMany({
      where: { userId },
      orderBy: { priority: "asc" },
    });
  }

  // TODO: 支持 Guest 权限
  async resolveUserPermission(userId: string, docId: string): Promise<PermissionLevel> {
    const permissions = await this.prismaService.documentPermission.findMany({
      where: {
        userId,
        docId,
      },
      orderBy: { priority: "asc" },
    });

    return this.applyPermissionPriority(permissions);
  }

  mapWorkspacePermissionToDocumentPermission(permission: PermissionLevel): PermissionLevel {
    switch (permission) {
      case PermissionLevel.MANAGE:
        return PermissionLevel.MANAGE;
      case PermissionLevel.EDIT:
        return PermissionLevel.MANAGE;
      default:
        return PermissionLevel.NONE;
    }
  }

  mapSubspacePermissionToDocumentPermission(permission: PermissionLevel): PermissionLevel {
    switch (permission) {
      case PermissionLevel.MANAGE:
        return PermissionLevel.MANAGE;
      case PermissionLevel.EDIT:
        return PermissionLevel.MANAGE;
      default:
        return PermissionLevel.NONE;
    }
  }

  // 权限优先级解析
  private applyPermissionPriority(permissions: DocumentPermission[]): PermissionLevel {
    if (permissions.length === 0) return PermissionLevel.NONE;

    // 按优先级排序，数字越小优先级越高
    const sortedPermissions = permissions.sort((a, b) => a.priority - b.priority);

    // 返回最高优先级的权限
    return sortedPermissions[0].permission;
  }

  // 分配工作空间权限
  async assignWorkspacePermissions(userId: string, workspaceId: string, role: WorkspaceRole, createdById: string) {
    // Workspace permissions are handled by WorkspaceMember model, not DocumentPermission
    // This method is kept for compatibility but doesn't create document permissions
    // The actual workspace membership is created in the workspace service
    return { userId, workspaceId, role, createdById };
  }

  // 分配子空间权限
  async assignSubspacePermissions(userId: string, subspaceId: string, role: SubspaceRole, createdById: string) {
    // Subspace permissions are handled by SubspaceMember model, not DocumentPermission
    // This method is kept for compatibility but doesn't create document permissions
    // The actual subspace membership is created in the subspace service
    return { userId, subspaceId, role, createdById };
  }

  // assign  direct permission to a user
  async assignUserPermission(userId: string, docId: string, permission: PermissionLevel, createdById: string) {
    const priority = this.getPriorityByPermissionInheritanceType(PermissionInheritanceType.DIRECT);

    return await this.prismaService.documentPermission.upsert({
      where: {
        userId_guestId_docId_inheritedFromType: {
          userId,
          guestId: "",
          docId,
          inheritedFromType: PermissionInheritanceType.DIRECT,
        },
      },
      create: {
        userId,
        docId,
        permission,
        inheritedFromType: PermissionInheritanceType.DIRECT,
        priority,
        createdById,
      },
      update: { permission },
    });
  }

  // assign group permission to a user
  async assignGroupPermissions(groupId: string, docId: string, permission: PermissionLevel, createdById: string) {
    const groupMembers = await this.prismaService.memberGroupUser.findMany({
      where: { groupId },
      include: { user: true },
    });

    const permissions: DocumentPermission[] = [];

    for (const member of groupMembers) {
      const groupPermission = await this.prismaService.documentPermission.upsert({
        where: {
          userId_guestId_docId_inheritedFromType: {
            userId: member.userId,
            guestId: "",
            docId,
            inheritedFromType: PermissionInheritanceType.GROUP,
          },
        },
        create: {
          userId: member.userId,
          docId,
          permission,
          inheritedFromType: PermissionInheritanceType.GROUP,
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
    // const guestPermission = await this.prismaService.documentPermission.create({
    //   data: {
    //     guestId: guest.id,
    //     docId: "DOCUMENT",
    //     docId: docId,
    //     permission,
    //     inheritedFromType: PermissionInheritanceType.GUEST,
    //     priority: 7,
    //     createdById: inviterId,
    //   },
    // });

    return { guest, permission: { level: PermissionLevel.READ } };
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
      await this.prismaService.subspaceMember.create({
        data: {
          userId: member.userId,
          subspaceId: subspaceId,
          role: SubspaceRole.MEMBER,
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
    return await this.prismaService.documentPermission.delete({
      where: { id: permissionId },
    });
  }

  // 更新权限
  async updatePermission(permissionId: string, newPermission: PermissionLevel) {
    return await this.prismaService.documentPermission.update({
      where: { id: permissionId },
      data: { permission: newPermission },
    });
  }

  private mapWorkspaceRoleToPermission(role: WorkspaceRole): PermissionLevel {
    switch (role) {
      case WorkspaceRole.OWNER:
        return PermissionLevel.MANAGE;
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

  private mapWorkspaceRoleToPermissionInheritanceType(role: WorkspaceRole): PermissionInheritanceType {
    return role === WorkspaceRole.MEMBER ? PermissionInheritanceType.WORKSPACE_MEMBER : PermissionInheritanceType.WORKSPACE_ADMIN;
  }

  private mapSubspaceRoleToPermissionInheritanceType(role: SubspaceRole): PermissionInheritanceType {
    return role === SubspaceRole.MEMBER ? PermissionInheritanceType.SUBSPACE_MEMBER : PermissionInheritanceType.SUBSPACE_ADMIN;
  }

  mapDocPermissionLevelToAbilities(permissionLevel: PermissionLevel) {
    switch (permissionLevel) {
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

  getPriorityByPermissionInheritanceType(inheritedFromType: PermissionInheritanceType): number {
    switch (inheritedFromType) {
      case PermissionInheritanceType.DIRECT:
        return 1;
      case PermissionInheritanceType.GROUP:
        return 2;
      case PermissionInheritanceType.SUBSPACE_ADMIN:
        return 3;
      case PermissionInheritanceType.SUBSPACE_MEMBER:
        return 4;
      case PermissionInheritanceType.WORKSPACE_ADMIN:
        return 5;
      case PermissionInheritanceType.WORKSPACE_MEMBER:
        return 6;
      case PermissionInheritanceType.GUEST:
        return 7;
      default:
        return 999;
    }
  }
}
