import { PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";
import { Inject, Injectable } from "@nestjs/common";
import { DocUserPermission, DocGroupPermission } from "@prisma/client";
import { Permission } from "@prisma/client";
import { ExtendedPrismaClient } from "@/_shared/database/prisma/prisma.extension";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { ApiException } from "@/_shared/exceptions/api.exception";

@Injectable()
export class PermissionInheritanceService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient) {}

  // Cascade propagation when creating permissions
  async propagatePermissionToChildren(parentDocId: string, permission: DocUserPermission | DocGroupPermission, type: "user" | "group") {
    const childDocs = await this.findChildDocuments(parentDocId);

    for (const childDoc of childDocs) {
      if (type === "user") {
        await this.createInheritedUserPermission(childDoc.id, permission as DocUserPermission);
      } else {
        await this.createInheritedGroupPermission(childDoc.id, permission as DocGroupPermission);
      }
    }
  }

  private async findChildDocuments(parentDocId: string) {
    return this.prisma.doc.findMany({
      where: { parentId: parentDocId },
    });
  }

  private async createInheritedUserPermission(docId: string, permission: DocUserPermission) {
    return this.prisma.docUserPermission.create({
      data: { ...permission, docId },
    });
  }

  private async createInheritedGroupPermission(docId: string, permission: DocGroupPermission) {
    return this.prisma.docGroupPermission.create({
      data: { ...permission, docId },
    });
  }

  // 更新权限时的级联更新
  async updateInheritedPermissions(sourcePermissionId: string, newPermission: Permission, type: "user" | "group") {
    if (type === "user") {
      await this.prisma.docUserPermission.updateMany({
        where: { sourceId: sourcePermissionId },
        data: { permission: newPermission },
      });
    } else {
      await this.prisma.docGroupPermission.updateMany({
        where: { sourceId: sourcePermissionId },
        data: { permission: newPermission },
      });
    }
  }

  // 删除权限时的级联清理
  async cleanupInheritedPermissions(sourcePermissionId: string, type: "user" | "group") {
    if (type === "user") {
      await this.prisma.docUserPermission.deleteMany({
        where: { sourceId: sourcePermissionId },
      });
    } else {
      await this.prisma.docGroupPermission.deleteMany({
        where: { sourceId: sourcePermissionId },
      });
    }
  }

  async updatePermissionsOnMove(docId: string, parentId: string | null, subspaceId: string | null) {
    const document = await this.prisma.doc.findUnique({
      where: { id: docId },
      include: { subspace: true },
    });

    if (!document) throw new ApiException(ErrorCodeEnum.DocumentNotFound);

    const originalSubspaceId = document.subspaceId;
    const targetSubspaceId = subspaceId || originalSubspaceId;
    const subspaceChanged = originalSubspaceId !== targetSubspaceId;

    // 1. 清理现有的继承权限
    await this.prisma.docUserPermission.deleteMany({
      where: {
        docId,
        sourceId: { not: null }, // 只删除继承的权限
      },
    });

    await this.prisma.docGroupPermission.deleteMany({
      where: {
        docId,
        sourceId: { not: null },
      },
    });

    // 2. 如果有新的父文档，复制父文档权限
    if (parentId) {
      await this.copyPermissionsFromParent(docId, parentId);
    }

    // 3. 如果跨subspace移动，需要处理subspace级别的权限
    if (subspaceChanged && targetSubspaceId) {
      if (originalSubspaceId) {
        await this.handleCrossSubspacePermissions(docId, originalSubspaceId, targetSubspaceId);
      } else {
        // TODO: move from personal docs to subspace
      }
    }

    // 4. 递归处理子文档
    await this.updateChildDocumentsPermissions(docId, parentId, targetSubspaceId);
  }

  private async copyPermissionsFromParent(documentId: string, parentDocumentId: string) {
    // 复制用户权限
    const parentUserPermissions = await this.prisma.docUserPermission.findMany({
      where: { docId: parentDocumentId },
    });

    for (const permission of parentUserPermissions) {
      await this.prisma.docUserPermission.create({
        data: {
          docId: documentId,
          userId: permission.userId,
          permission: permission.permission,
          sourceId: permission.sourceId ?? permission.id, // 维护继承链
          createdById: permission.createdById,
          index: permission.index,
        },
      });
    }

    // 复制组权限
    const parentGroupPermissions = await this.prisma.docGroupPermission.findMany({
      where: { docId: parentDocumentId },
    });

    for (const permission of parentGroupPermissions) {
      await this.prisma.docGroupPermission.create({
        data: {
          docId: documentId,
          groupId: permission.groupId,
          permission: permission.permission,
          sourceId: permission.sourceId ?? permission.id,
          userId: permission.userId,
          createdById: permission.createdById,
        },
      });
    }
  }

  private async handleCrossSubspacePermissions(docId: string, originalSubspaceId: string, targetSubspaceId: string) {
    // 移除原 subspace 相关的权限
    await this.prisma.docUserPermission.deleteMany({
      where: {
        docId,
        subspaceMemberId: { not: null },
        subspaceMember: {
          subspaceId: originalSubspaceId,
        },
      },
    });

    await this.prisma.docGroupPermission.deleteMany({
      where: {
        docId,
        // 这里需要根据实际的 schema 调整查询条件
      },
    });

    // 添加新 subspace 的默认权限
    const targetSubspaceMembers = await this.prisma.subspaceMember.findMany({
      where: { subspaceId: targetSubspaceId },
      include: { user: true },
    });

    for (const member of targetSubspaceMembers) {
      // 根据 subspace 角色分配相应权限
      const permission = member.role === "ADMIN" ? "MANAGE" : "READ";

      await this.prisma.docUserPermission.create({
        data: {
          docId,
          userId: member.userId,
          permission: permission as Permission,
          createdById: member.userId,
          subspaceMemberId: member.id,
        },
      });
    }
  }

  private async updateChildDocumentsPermissions(docId: string, parentId: string | null, targetSubspaceId: string | null) {
    // 查找所有子文档
    const childDocuments = await this.findChildDocuments(docId);

    for (const childDoc of childDocuments) {
      // 清理子文档的继承权限
      await this.prisma.docUserPermission.deleteMany({
        where: {
          docId: childDoc.id,
          sourceId: { not: null },
        },
      });

      await this.prisma.docGroupPermission.deleteMany({
        where: {
          docId: childDoc.id,
          sourceId: { not: null },
        },
      });

      // 更新子文档的 subspace
      await this.prisma.doc.update({
        where: { id: childDoc.id },
        data: { subspaceId: targetSubspaceId ?? null },
      });

      // 从新的父文档复制权限
      if (parentId) {
        await this.copyPermissionsFromParent(childDoc.id, docId);
      }

      // 递归处理更深层的子文档
      await this.updateChildDocumentsPermissions(childDoc.id, docId, targetSubspaceId);
    }
  }
}
