import { Inject, Injectable } from "@nestjs/common";
import { ExtendedPrismaClient, PRISMA_CLIENT } from "../database/prisma/prisma.extension";
import { Permission, SubspaceRole, WorkspaceRole } from "@prisma/client";

@Injectable()
export class PermissionHierarchyService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient) {}

  async resolveUserHierarchicalPermissions(userId: string, resourceId: string, resourceType: "Doc" | "Subspace"): Promise<Permission> {
    const permissions: Permission[] = [];

    // 1. 获取Workspace权限
    const workspacePermission = await this.getWorkspacePermission(userId, resourceId, resourceType);
    if (workspacePermission && workspacePermission !== "NONE") {
      permissions.push(workspacePermission);
    }

    // 2. 获取Subspace权限
    if (resourceType === "Doc") {
      const subspacePermission = await this.getSubspacePermission(userId, resourceId);
      if (subspacePermission && subspacePermission !== "NONE") {
        permissions.push(subspacePermission);
      }
    }

    // 3. 获取直接权限
    const directPermission = await this.getDirectPermission(userId, resourceId, resourceType);
    if (directPermission && directPermission !== "NONE") {
      permissions.push(directPermission);
    }

    // 返回最高权限
    return this.getHighestPermission(permissions);
  }

  private async getWorkspacePermission(userId: string, resourceId: string, resourceType: "Doc" | "Subspace"): Promise<Permission | null> {
    try {
      let workspaceId: string | null = null;

      if (resourceType === "Doc") {
        // 获取文档所属的workspace
        const doc = await this.prisma.doc.findUnique({
          where: { id: resourceId },
          select: { workspaceId: true },
        });
        workspaceId = doc?.workspaceId || null;
      } else if (resourceType === "Subspace") {
        // 获取subspace所属的workspace
        const subspace = await this.prisma.subspace.findUnique({
          where: { id: resourceId },
          select: { workspaceId: true },
        });
        workspaceId = subspace?.workspaceId || null;
      }

      if (!workspaceId) return null;

      // 检查用户在该workspace的成员关系
      const membership = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },
      });

      return this.mapWorkspaceRoleToPermission(membership?.role);
    } catch (error) {
      console.error("Error getting workspace permission:", error);
      return null;
    }
  }

  private async getSubspacePermission(userId: string, docId: string): Promise<Permission | null> {
    try {
      // 获取文档所属的subspace
      const doc = await this.prisma.doc.findUnique({
        where: { id: docId },
        select: { subspaceId: true },
      });

      if (!doc?.subspaceId) return null;

      // 检查用户在该subspace的成员关系
      const membership = await this.prisma.subspaceMember.findUnique({
        where: {
          subspaceId_userId: {
            subspaceId: doc.subspaceId,
            userId,
          },
        },
      });

      // 将SubspaceRole映射为Permission
      return this.mapSubspaceRoleToPermission(membership?.role);
    } catch (error) {
      console.error("Error getting subspace permission:", error);
      return null;
    }
  }

  private async getDirectPermission(userId: string, resourceId: string, resourceType: "Doc" | "Subspace"): Promise<Permission | null> {
    try {
      if (resourceType === "Doc") {
        // 获取用户对文档的直接权限
        const userPermission = await this.prisma.docUserPermission.findUnique({
          where: { docId_userId: { docId: resourceId, userId } },
        });

        if (userPermission) return userPermission.permission;

        // 获取用户通过组获得的权限
        const groupPermissions = await this.prisma.docGroupPermission.findMany({
          where: {
            docId: resourceId,
            group: {
              members: {
                some: { userId },
              },
            },
          },
        });

        if (groupPermissions.length > 0) {
          return this.getHighestPermission(groupPermissions.map((gp) => gp.permission));
        }
      } else if (resourceType === "Subspace") {
        // 获取用户对subspace的直接权限
        const userPermission = await this.prisma.subspaceMemberPermission.findUnique({
          where: { subspaceId_userId: { subspaceId: resourceId, userId } },
        });

        return userPermission?.permission || null;
      }

      return null;
    } catch (error) {
      console.error("Error getting direct permission:", error);
      return null;
    }
  }

  private getHighestPermission(permissions: Permission[]): Permission {
    if (permissions.length === 0) return "NONE";

    const hierarchy = ["NONE", "READ", "COMMENT", "EDIT", "SHARE", "MANAGE"];

    return permissions.reduce((highest, current) => {
      const currentIndex = hierarchy.indexOf(current);
      const highestIndex = hierarchy.indexOf(highest);
      return currentIndex > highestIndex ? current : highest;
    }, "NONE" as Permission);
  }

  private mapSubspaceRoleToPermission(role?: SubspaceRole): Permission {
    if (!role) return "NONE";

    switch (role) {
      case "ADMIN":
        return "MANAGE";
      case "MEMBER":
        return "READ";
      default:
        return "NONE";
    }
  }

  private mapWorkspaceRoleToPermission(role?: WorkspaceRole): Permission {
    if (!role) return "NONE";

    switch (role) {
      case "OWNER":
        return "MANAGE";
      case "ADMIN":
        return "SHARE";
      case "MEMBER":
        return "READ";
      default:
        return "NONE";
    }
  }
}
