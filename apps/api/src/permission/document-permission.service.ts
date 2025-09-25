import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { PermissionLevel, PermissionInheritanceType, SubspaceRole, SubspaceType, DocumentPermission, WorkspaceRole } from "@idea/contracts";

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

    // 2. Subspace level (SUBSPACE_ADMIN, SUBSPACE_MEMBER)
    if (doc.subspaceId) {
      // 2.1. Check subspace role-based permissions
      const subspaceRolePermission = await this.getSubspaceRoleBasedPermission(userId, doc.subspaceId);
      if (subspaceRolePermission !== PermissionLevel.NONE) {
        return subspaceRolePermission;
      }
    }

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
        // 2.1. Check subspace role-based permissions
        const subspaceRolePermission = await this.getSubspaceRoleBasedPermission(userId, doc.subspaceId);
        if (subspaceRolePermission !== PermissionLevel.NONE) {
          result[doc.id] = subspaceRolePermission;
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

  // assign initial permissions based on subspace type
  async assignSubspaceTypePermissions(subspaceId: string, subspaceType: SubspaceType, workspaceId: string, creatorId: string) {
    switch (subspaceType) {
      case SubspaceType.WORKSPACE_WIDE: {
        // Assign permissions to all workspace members
        const workspaceMembers = await this.prismaService.workspaceMember.findMany({
          where: { workspaceId },
        });
        for (const member of workspaceMembers) {
          const role = member.userId === creatorId ? SubspaceRole.ADMIN : SubspaceRole.MEMBER;
          await this.assignSubspacePermissions(member.userId, subspaceId, role, creatorId);
        }
        break;
      }
      case SubspaceType.PUBLIC: {
        // Creator is admin, other workspace members can comment
        await this.assignSubspacePermissions(creatorId, subspaceId, SubspaceRole.ADMIN, creatorId);

        const otherWorkspaceMembers = await this.prismaService.workspaceMember.findMany({
          where: {
            workspaceId,
            userId: { not: creatorId },
          },
        });

        for (const member of otherWorkspaceMembers) {
          await this.prismaService.subspaceMember.create({
            data: {
              userId: member.userId,
              subspaceId: subspaceId,
              role: SubspaceRole.MEMBER,
            },
          });
        }
        break;
      }
      case SubspaceType.INVITE_ONLY:
        // Only creator has permissions
        await this.assignSubspacePermissions(creatorId, subspaceId, SubspaceRole.ADMIN, creatorId);
        break;
      case SubspaceType.PRIVATE:
        // Only creator has permissions
        await this.assignSubspacePermissions(creatorId, subspaceId, SubspaceRole.ADMIN, creatorId);
        break;
    }
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

  /**
   * Get permission level based on user's role in the subspace
   */
  private async getSubspaceRoleBasedPermission(userId: string, subspaceId: string): Promise<PermissionLevel> {
    // Get subspace with permission settings
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id: subspaceId },
      select: {
        id: true,
        subspaceAdminPermission: true,
        subspaceMemberPermission: true,
        nonSubspaceMemberPermission: true,
        members: {
          where: { userId },
          select: { role: true },
        },
      },
    });

    if (!subspace) {
      return PermissionLevel.NONE;
    }

    // Check if user is a member of the subspace
    const membership = subspace.members[0];
    if (membership) {
      // User is a member, check their role
      switch (membership.role) {
        case "ADMIN":
          return subspace.subspaceAdminPermission;
        case "MEMBER":
          return subspace.subspaceMemberPermission;
        default:
          return PermissionLevel.NONE;
      }
    }

    // User is not a member, use non-subspace member permission
    return subspace.nonSubspaceMemberPermission;
  }
}
