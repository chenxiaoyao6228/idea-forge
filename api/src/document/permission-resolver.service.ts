import { ExtendedPrismaClient } from "@/_shared/database/prisma/prisma.extension";
import { Injectable } from "@nestjs/common";
import { PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";
import { Inject } from "@nestjs/common";
import { Permission } from "@prisma/client";

@Injectable()
export class PermissionResolverService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient) {}

  // Resolve user's final permission for the document
  async resolveUserPermission(userId: string, docId: string): Promise<Permission> {
    // 1. Direct permission
    const directPermission = await this.prisma.docUserPermission.findUnique({
      where: { docId_userId: { docId, userId } },
    });

    // 2. Group permission
    const groupPermissions = await this.prisma.docGroupPermission.findMany({
      where: {
        docId,
        group: {
          members: {
            some: { userId },
          },
        },
      },
      include: { group: true },
    });

    // 3. Workspace/Subspace permission
    const workspacePermissions = await this.getWorkspacePermissions(userId, docId);
    const subspacePermissions = await this.getSubspacePermissions(userId, docId);

    // Permission merge logic: take the highest permission
    return this.mergePermissions(
      [directPermission?.permission, ...groupPermissions.map((gp) => gp.permission), workspacePermissions, subspacePermissions].filter(Boolean),
    );
  }

  private mergePermissions(permissions: Permission[]): Permission {
    const hierarchy = ["NONE", "READ", "COMMENT", "EDIT", "SHARE", "MANAGE"];
    return permissions.reduce((highest, current) => {
      return hierarchy.indexOf(current) > hierarchy.indexOf(highest) ? current : highest;
    }, "NONE" as Permission);
  }
}
