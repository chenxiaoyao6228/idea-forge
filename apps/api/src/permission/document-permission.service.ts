import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { PermissionLevel, PermissionInheritanceType, SubspaceRole, SubspaceType, DocumentPermission, WorkspaceRole } from "@idea/contracts";

@Injectable()
export class DocPermissionResolveService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Dynamically resolve a user's permission for a document by traversing the permission inheritance chain.
   * Priority: DIRECT/GROUP (document) > document subspace overrides > subspace role > guest > none
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

    if (doc.subspaceId) {
      // check if user is a workspace member, might be a guest collaborator
      const member = await this.prismaService.workspaceMember.findFirst({
        where: {
          workspaceId: doc.workspaceId,
          userId,
        },
      });
      if (member) {
        // 2. Document-level subspace permission overrides
        const documentSubspacePermission = await this.getDocumentSubspaceRoleBasedPermission(userId, doc.id, doc.subspaceId);
        if (documentSubspacePermission !== PermissionLevel.NONE) {
          return documentSubspacePermission;
        }
        // 3. Subspace level (SUBSPACE_ADMIN, SUBSPACE_MEMBER)
        // 3.1. Check subspace role-based permissions
        const subspaceRolePermission = await this.getSubspaceRoleBasedPermission(userId, doc.subspaceId);
        if (subspaceRolePermission !== PermissionLevel.NONE) {
          return subspaceRolePermission;
        }
      }
    }

    // 4. Guest permissions (for users not in workspace)
    const guestPermission = await this.getGuestPermissionForDocument(userId, doc.id, doc.workspaceId);
    if (guestPermission !== PermissionLevel.NONE) {
      return guestPermission;
    }

    // 5. Default
    return PermissionLevel.NONE;
  }

  /**
   * Get permission level based on document-level subspace permission overrides
   */
  private async getDocumentSubspaceRoleBasedPermission(userId: string, documentId: string, subspaceId: string): Promise<PermissionLevel> {
    // Get document with permission overrides
    const document = await this.prismaService.doc.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        subspaceAdminPermission: true,
        subspaceMemberPermission: true,
        nonSubspaceMemberPermission: true,
      },
    });

    if (!document) {
      return PermissionLevel.NONE;
    }

    // Get user's role in the subspace
    const subspaceMembership = await this.prismaService.subspaceMember.findFirst({
      where: {
        subspaceId,
        userId,
      },
      select: { role: true },
    });

    // Check if document has overrides for this role
    if (subspaceMembership) {
      switch (subspaceMembership.role) {
        case "ADMIN":
          // If document has a specific override (not null), use it; otherwise return NONE to inherit from subspace
          return document.subspaceAdminPermission !== null ? document.subspaceAdminPermission : PermissionLevel.NONE;
        case "MEMBER":
          // If document has a specific override (not null), use it; otherwise return NONE to inherit from subspace
          return document.subspaceMemberPermission !== null ? document.subspaceMemberPermission : PermissionLevel.NONE;
        default:
          return PermissionLevel.NONE;
      }
    }

    // User is not a member, check non-subspace member permission
    // If document has a specific override (not null), use it; otherwise return NONE to inherit from subspace
    return document.nonSubspaceMemberPermission !== null ? document.nonSubspaceMemberPermission : PermissionLevel.NONE;
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

  /**
   * Get guest permission for a document (for users not in workspace)
   */
  private async getGuestPermissionForDocument(userId: string, documentId: string, workspaceId: string): Promise<PermissionLevel> {
    // First, get the user's email
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      return PermissionLevel.NONE;
    }

    // Check if there's a guest collaborator with the same email
    const guestCollaborator = await this.prismaService.guestCollaborator.findFirst({
      where: {
        email: user.email,
        workspaceId: workspaceId,
      },
    });

    if (!guestCollaborator) {
      return PermissionLevel.NONE;
    }

    // Check if the guest collaborator has permissions for this document
    const guestPermission = await this.prismaService.documentPermission.findFirst({
      where: {
        guestCollaboratorId: guestCollaborator.id,
        docId: documentId,
        inheritedFromType: PermissionInheritanceType.GUEST,
      },
      orderBy: { priority: "asc" },
    });

    return guestPermission ? guestPermission.permission : PermissionLevel.NONE;
  }
}
