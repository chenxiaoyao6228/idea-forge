import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { SourceType, ResourceType, PermissionLevel, UnifiedPermission, SubspaceType, SubspaceRole } from "@prisma/client";
import { PermissionService } from "./permission.service";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";

@Injectable()
export class PermissionInheritanceService {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => PermissionService)) private readonly permissionService: PermissionService,
  ) {}

  // 支持所有资源类型的权限传播
  async propagatePermissions(resourceType: ResourceType, resourceId: string, permission: UnifiedPermission) {
    switch (resourceType) {
      case ResourceType.WORKSPACE:
        await this.propagateWorkspacePermissions(resourceId, permission);
        break;
      case ResourceType.SUBSPACE:
        await this.propagateSubspacePermissions(resourceId, permission);
        break;
      case ResourceType.DOCUMENT:
        await this.propagateToChildren(resourceId, permission);
        break;
    }
  }

  // 工作空间权限传播到所有子空间和文档
  private async propagateWorkspacePermissions(workspaceId: string, permission: UnifiedPermission) {
    // 1. 传播到所有子空间
    const subspaces = await this.prismaService.subspace.findMany({
      where: { workspaceId },
    });

    for (const subspace of subspaces) {
      await this.createInheritedPermission(ResourceType.SUBSPACE, subspace.id, permission, SourceType.WORKSPACE_MEMBER);

      // 递归传播到子空间内的文档
      await this.propagateSubspacePermissions(subspace.id, permission);
    }
  }

  // 子空间权限传播到所有文档
  private async propagateSubspacePermissions(subspaceId: string, permission: UnifiedPermission) {
    const docs = await this.prismaService.doc.findMany({
      where: { subspaceId },
    });

    for (const doc of docs) {
      await this.createInheritedPermission(ResourceType.DOCUMENT, doc.id, permission, SourceType.SUBSPACE_MEMBER);

      // 递归处理子文档
      await this.propagateToChildren(doc.id, permission);
    }
  }

  // 文档权限传播到子文档
  async propagateToChildren(parentDocId: string, permission: UnifiedPermission) {
    const childDocs = await this.prismaService.doc.findMany({
      where: { parentId: parentDocId },
    });

    for (const child of childDocs) {
      await this.prismaService.unifiedPermission.create({
        data: {
          userId: permission.userId,
          guestId: permission.guestId,
          resourceType: ResourceType.DOCUMENT,
          resourceId: child.id,
          permission: permission.permission,
          sourceType: permission.sourceType,
          sourceId: permission.id, // 指向父权限
          priority: permission.priority,
          createdById: permission.createdById,
        },
      });

      // 递归处理更深层子文档
      await this.propagateToChildren(child.id, permission);
    }
  }

  // 统一的权限创建方法
  private async createInheritedPermission(resourceType: ResourceType, resourceId: string, sourcePermission: UnifiedPermission, sourceType: SourceType) {
    await this.prismaService.unifiedPermission.create({
      data: {
        userId: sourcePermission.userId,
        guestId: sourcePermission.guestId,
        resourceType,
        resourceId,
        permission: sourcePermission.permission,
        sourceType,
        sourceId: sourcePermission.id,
        priority: this.getPriorityBySourceType(sourceType),
        createdById: sourcePermission.createdById,
      },
    });
  }

  // 文档移动时更新权限
  async updatePermissionsOnMove(docId: string, newParentId: string | null, newSubspaceId: string | null) {
    // 1. 清理现有继承权限
    await this.prismaService.unifiedPermission.deleteMany({
      where: {
        resourceType: ResourceType.DOCUMENT,
        resourceId: docId,
        sourceId: { not: null },
      },
    });

    // 2. 从新父文档继承权限
    if (newParentId) {
      await this.inheritFromParent(docId, newParentId);
    }

    // 3. 应用新子空间权限
    if (newSubspaceId) {
      await this.applySubspacePermissions(docId, newSubspaceId);
    }

    // 4. 递归处理子文档
    await this.updateChildDocumentsPermissions(docId);
  }

  // 从父文档继承权限
  private async inheritFromParent(docId: string, parentDocId: string) {
    const parentPermissions = await this.prismaService.unifiedPermission.findMany({
      where: {
        resourceType: ResourceType.DOCUMENT,
        resourceId: parentDocId,
      },
    });

    for (const parentPerm of parentPermissions) {
      await this.prismaService.unifiedPermission.create({
        data: {
          userId: parentPerm.userId,
          guestId: parentPerm.guestId,
          resourceType: ResourceType.DOCUMENT,
          resourceId: docId,
          permission: parentPerm.permission,
          sourceType: parentPerm.sourceType,
          sourceId: parentPerm.id,
          priority: parentPerm.priority,
          createdById: parentPerm.createdById,
        },
      });
    }
  }

  // 应用子空间权限到文档
  private async applySubspacePermissions(docId: string, subspaceId: string) {
    // 获取子空间成员权限
    const subspaceMembers = await this.prismaService.subspaceMember.findMany({
      where: { subspaceId },
      include: { user: true },
    });

    for (const member of subspaceMembers) {
      const permission = member.role === SubspaceRole.ADMIN ? PermissionLevel.MANAGE : PermissionLevel.READ;
      const sourceType = member.role === SubspaceRole.ADMIN ? SourceType.SUBSPACE_ADMIN : SourceType.SUBSPACE_MEMBER;
      const priority = member.role === SubspaceRole.ADMIN ? 3 : 4;

      await this.prismaService.unifiedPermission.create({
        data: {
          userId: member.userId,
          resourceType: ResourceType.DOCUMENT,
          resourceId: docId,
          permission,
          sourceType,
          priority,
          createdById: member.userId,
        },
      });
    }
  }

  // 递归更新子文档权限
  private async updateChildDocumentsPermissions(docId: string) {
    const childDocs = await this.prismaService.doc.findMany({
      where: { parentId: docId },
    });

    for (const child of childDocs) {
      // 递归更新子文档权限
      await this.updatePermissionsOnMove(child.id, docId, null);
    }
  }

  // 级联更新继承权限
  async updateInheritedPermissions(sourcePermissionId: string, newPermission: PermissionLevel) {
    await this.prismaService.unifiedPermission.updateMany({
      where: { sourceId: sourcePermissionId },
      data: { permission: newPermission },
    });
  }

  // 级联删除继承权限
  async cleanupInheritedPermissions(sourcePermissionId: string) {
    await this.prismaService.unifiedPermission.deleteMany({
      where: { sourceId: sourcePermissionId },
    });
  }

  // 处理子空间类型变更时的权限更新
  async updateSubspaceTypePermissions(subspaceId: string, oldType: SubspaceType, newType: SubspaceType, workspaceId: string, adminId: string) {
    // 清理现有的子空间类型相关权限
    await this.cleanupSubspaceTypePermissions(subspaceId, oldType);

    // 应用新的子空间类型权限
    await this.permissionService.assignSubspaceTypePermissions(subspaceId, newType, workspaceId, adminId);
  }

  // 清理子空间类型相关权限
  private async cleanupSubspaceTypePermissions(subspaceId: string, subspaceType: SubspaceType) {
    switch (subspaceType) {
      case SubspaceType.WORKSPACE_WIDE:
        // 清理所有工作空间成员的自动权限
        await this.prismaService.unifiedPermission.deleteMany({
          where: {
            resourceType: ResourceType.SUBSPACE,
            resourceId: subspaceId,
            sourceType: { in: [SourceType.WORKSPACE_MEMBER, SourceType.WORKSPACE_ADMIN] },
          },
        });
        break;
      case SubspaceType.PUBLIC:
        // 清理公开空间的评论权限
        await this.prismaService.unifiedPermission.deleteMany({
          where: {
            resourceType: ResourceType.SUBSPACE,
            resourceId: subspaceId,
            permission: PermissionLevel.COMMENT,
            sourceType: SourceType.WORKSPACE_MEMBER,
          },
        });
        break;
      case SubspaceType.INVITE_ONLY:
      case SubspaceType.PRIVATE:
        // 这些类型只有明确邀请的成员，不需要特殊清理
        break;
    }
  }

  // 处理成员组权限变更
  async updateGroupPermissions(groupId: string, resourceType: ResourceType, resourceId: string, newPermission: PermissionLevel) {
    // 更新组内所有成员的权限
    const groupMembers = await this.prismaService.memberGroupUser.findMany({
      where: { groupId },
    });

    for (const member of groupMembers) {
      await this.prismaService.unifiedPermission.updateMany({
        where: {
          userId: member.userId,
          resourceType,
          resourceId,
          sourceType: SourceType.GROUP,
        },
        data: { permission: newPermission },
      });
    }

    // 传播到子资源
    const groupPermissions = await this.prismaService.unifiedPermission.findMany({
      where: {
        resourceType,
        resourceId,
        sourceType: SourceType.GROUP,
      },
    });

    for (const permission of groupPermissions) {
      await this.propagatePermissions(resourceType, resourceId, permission);
    }
  }

  // 处理访客权限过期
  async cleanupExpiredGuestPermissions() {
    const expiredGuests = await this.prismaService.guestCollaborator.findMany({
      where: {
        expireAt: { lt: new Date() },
        status: { not: "EXPIRED" },
      },
    });

    for (const guest of expiredGuests) {
      // 删除过期访客的所有权限
      await this.prismaService.unifiedPermission.deleteMany({
        where: { guestId: guest.id },
      });

      // 更新访客状态
      await this.prismaService.guestCollaborator.update({
        where: { id: guest.id },
        data: { status: "EXPIRED" },
      });
    }
  }

  // 获取源类型对应的优先级
  private getPriorityBySourceType(sourceType: SourceType): number {
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
