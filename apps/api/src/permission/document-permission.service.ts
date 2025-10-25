import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { PermissionLevel, PermissionInheritanceType, PermissionResolutionResult } from "@idea/contracts";

type DocContext = {
  id: string;
  parentId?: string | null;
  subspaceId?: string | null;
  workspaceId: string;
};

@Injectable()
export class DocPermissionResolveService {
  private readonly logger = new Logger(DocPermissionResolveService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Dynamically resolve a user's permission for a document by traversing the permission inheritance chain.
   *
   * Permission Resolution Order (highest to lowest priority):
   * 1. DIRECT document permissions (priority: 1)
   * 2. GROUP document permissions (priority: 2)
   * 3. Inherited permissions from parent documents (DIRECT/GROUP only)
   * 4. Document-level subspace permission overrides
   * 5. Subspace role-based permissions (SUBSPACE_ADMIN, SUBSPACE_MEMBER)
   * 6. Guest permissions (GUEST)
   * 7. NONE (no access)
   */
  async resolveUserPermissionForDocument(userId: string, doc: DocContext): Promise<PermissionResolutionResult> {
    // 1. Check for direct document-level permissions (DIRECT, GROUP)
    const docPerms = await this.prismaService.documentPermission.findMany({
      where: {
        userId,
        docId: doc.id,
        inheritedFromType: { in: [PermissionInheritanceType.DIRECT, PermissionInheritanceType.GROUP] },
      },
      orderBy: { priority: "asc" },
    });
    if (docPerms.length) {
      // If multiple permissions with same priority exist (e.g., multiple GROUP permissions),
      // pick the one with highest permission level
      const permissionLevels = ["NONE", "READ", "COMMENT", "EDIT", "MANAGE"];
      const highestPriorityGroup = docPerms.filter((p) => p.priority === docPerms[0].priority);

      let perm = highestPriorityGroup[0];
      if (highestPriorityGroup.length > 1) {
        // Multiple permissions with same priority - pick highest level
        perm = highestPriorityGroup.reduce((highest, current) => {
          const highestIndex = permissionLevels.indexOf(highest.permission);
          const currentIndex = permissionLevels.indexOf(current.permission);
          return currentIndex > highestIndex ? current : highest;
        }, highestPriorityGroup[0]);
      }

      // Fetch document title for source metadata
      const document = await this.prismaService.doc.findUnique({
        where: { id: doc.id },
        select: { id: true, title: true },
      });

      return {
        level: perm.permission,
        source: perm.inheritedFromType === PermissionInheritanceType.DIRECT ? "direct" : "group",
        sourceDocId: doc.id,
        sourceDocTitle: document?.title,
        priority: perm.priority,
      };
    }

    // 2. Traverse ancestor chain for inherited permissions
    // This implements live inheritance - no permission records are copied
    const inheritedResult = await this.getInheritedPermissionFromAncestors(userId, doc);
    if (inheritedResult.level !== PermissionLevel.NONE) {
      return inheritedResult;
    }

    // 3. Check subspace-based permissions (only for workspace members)
    if (doc.subspaceId) {
      // Verify user is a workspace member (not a guest collaborator)
      const member = await this.prismaService.workspaceMember.findFirst({
        where: {
          workspaceId: doc.workspaceId,
          userId,
        },
      });
      if (member) {
        // 3a. Document-level subspace permission overrides
        const documentSubspacePermission = await this.getDocumentSubspaceRoleBasedPermission(userId, doc.id, doc.subspaceId);
        if (documentSubspacePermission !== PermissionLevel.NONE) {
          return {
            level: documentSubspacePermission,
            source: "subspace",
            priority: 4, // Subspace priority range is 3-4
          };
        }
        // 3b. Subspace role-based permissions (SUBSPACE_ADMIN, SUBSPACE_MEMBER)
        const subspaceRolePermission = await this.getSubspaceRoleBasedPermission(userId, doc.subspaceId);
        if (subspaceRolePermission !== PermissionLevel.NONE) {
          return {
            level: subspaceRolePermission,
            source: "subspace",
            priority: 4,
          };
        }
      }
    }

    // 4. Guest permissions (for users not in workspace)
    const guestPermission = await this.getGuestPermissionForDocument(userId, doc.id, doc.workspaceId);
    if (guestPermission !== PermissionLevel.NONE) {
      return {
        level: guestPermission,
        source: "guest",
        priority: 7,
      };
    }

    // 5. Default: no access
    return {
      level: PermissionLevel.NONE,
      source: "none",
      priority: 999,
    };
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
        name: true,
        type: true,
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
      this.logger.warn(`[PERMISSION] Subspace ${subspaceId} not found`);
      return PermissionLevel.NONE;
    }

    this.logger.log(
      `[PERMISSION] Subspace ${subspace.name} (${subspace.type}): admin=${subspace.subspaceAdminPermission}, member=${subspace.subspaceMemberPermission}, nonMember=${subspace.nonSubspaceMemberPermission}`,
    );

    // Check if user is a member of the subspace
    const membership = subspace.members[0];
    if (membership) {
      // User is a member, check their role
      this.logger.log(`[PERMISSION] User ${userId} is a ${membership.role} of subspace ${subspace.name}`);
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
    this.logger.log(
      `[PERMISSION] User ${userId} is NOT a member of subspace ${subspace.name}, using nonSubspaceMemberPermission=${subspace.nonSubspaceMemberPermission}`,
    );
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

  /**
   * Traverse ancestor chain to find inherited permissions for a document.
   * Only DIRECT and GROUP permissions are inherited from parent documents.
   * This implements dynamic permission inheritance without copying permission records.
   */
  private async getInheritedPermissionFromAncestors(userId: string, doc: DocContext, maxDepth = 25): Promise<PermissionResolutionResult> {
    const visited = new Set<string>();
    const inheritanceChain: string[] = [doc.id];
    let depth = 0;

    // Ensure we have parentId - fetch if not provided
    let currentParentId: string | null | undefined = doc.parentId;
    if (currentParentId === undefined) {
      const currentDoc = await this.fetchDocContext(doc.id);
      currentParentId = currentDoc?.parentId ?? null;
    }

    // Walk up the parent chain
    while (currentParentId && depth < maxDepth) {
      // Detect circular references
      if (visited.has(currentParentId)) {
        this.logger.warn(`Circular document hierarchy detected while resolving permissions for document ${doc.id}`);
        return {
          level: PermissionLevel.NONE,
          source: "none",
          priority: 999,
        };
      }
      visited.add(currentParentId);
      inheritanceChain.push(currentParentId);

      // Check for DIRECT or GROUP permissions on the parent document
      // These are the only permission types that cascade to children
      const parentPerms = await this.prismaService.documentPermission.findMany({
        where: {
          userId,
          docId: currentParentId,
          inheritedFromType: { in: [PermissionInheritanceType.DIRECT, PermissionInheritanceType.GROUP] },
        },
        orderBy: { priority: "asc" },
      });

      if (parentPerms.length) {
        // If multiple permissions with same priority exist (e.g., multiple GROUP permissions from different groups),
        // pick the one with highest permission level
        const permissionLevels = ["NONE", "READ", "COMMENT", "EDIT", "MANAGE"];
        const highestPriorityGroup = parentPerms.filter((p) => p.priority === parentPerms[0].priority);

        let perm = highestPriorityGroup[0];
        if (highestPriorityGroup.length > 1) {
          // Multiple permissions with same priority - pick highest level
          perm = highestPriorityGroup.reduce((highest, current) => {
            const highestIndex = permissionLevels.indexOf(highest.permission);
            const currentIndex = permissionLevels.indexOf(current.permission);
            return currentIndex > highestIndex ? current : highest;
          }, highestPriorityGroup[0]);
        }

        // Fetch parent doc title for better UX
        const parentDoc = await this.prismaService.doc.findUnique({
          where: { id: currentParentId },
          select: { id: true, title: true },
        });

        return {
          level: perm.permission,
          source: "inherited",
          sourceDocId: currentParentId,
          sourceDocTitle: parentDoc?.title,
          priority: perm.priority,
          inheritanceChain,
        };
      }

      // Fetch parent's parent to continue traversal
      const parentDoc = await this.fetchDocContext(currentParentId);
      if (!parentDoc) {
        break;
      }

      currentParentId = parentDoc.parentId ?? null;
      depth++;
    }

    if (depth >= maxDepth) {
      this.logger.warn(`Permission inheritance depth limit (${maxDepth}) reached for document ${doc.id}`);
    }

    return {
      level: PermissionLevel.NONE,
      source: "none",
      priority: 999,
    };
  }

  /**
   * Fetch document context for permission resolution
   */
  private async fetchDocContext(documentId: string): Promise<DocContext | null> {
    return this.prismaService.doc.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        parentId: true,
        subspaceId: true,
        workspaceId: true,
      },
    });
  }
}
