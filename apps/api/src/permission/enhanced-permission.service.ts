import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { PermissionLevel, ResourceType, SourceType, SubspaceRole, SubspaceType, WorkspaceRole } from "@idea/contracts";
import type { UnifiedPermission, Doc, Subspace, Workspace, SubspaceMember, WorkspaceMember } from "@idea/contracts";

interface DocumentContext {
  id: string;
  subspaceId?: string | null;
  workspaceId: string;
  parentId?: string | null;
  authorId: string;
  subspace?: {
    id: string;
    type: SubspaceType;
    subspaceAdminPermission: PermissionLevel;
    subspaceMemberPermission: PermissionLevel;
    nonSubspaceMemberPermission: PermissionLevel;
  } | null;
  workspace?: {
    id: string;
  };
}

interface UserPermissionContext {
  userId: string;
  workspaceRole?: WorkspaceRole;
  subspaceRole?: SubspaceRole;
  isWorkspaceMember: boolean;
  isSubspaceMember: boolean;
}

interface PermissionResolution {
  permission: PermissionLevel;
  source: SourceType;
  resourceType: ResourceType;
  resourceId: string;
  priority: number;
}

@Injectable()
export class EnhancedPermissionService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Comprehensive document permission resolver with full inheritance chain
   * Priority: DIRECT (1) > GROUP (2) > SUBSPACE_ADMIN (3) > SUBSPACE_MEMBER (4) > WORKSPACE_ADMIN (5) > WORKSPACE_MEMBER (6) > GUEST (7)
   */
  async resolveDocumentPermissionForUser(userId: string, docId: string): Promise<PermissionLevel> {
    // Get document with full context
    const document = await this.getDocumentWithContext(docId);
    if (!document) {
      return PermissionLevel.NONE;
    }

    // If user is the author, they always have OWNER permission
    if (document.authorId === userId) {
      return PermissionLevel.OWNER;
    }

    // Get user's permission context
    const userContext = await this.getUserPermissionContext(userId, document.workspaceId, document.subspaceId);

    // Resolve permission through inheritance chain
    const resolution = await this.resolvePermissionWithInheritance(userId, document, userContext);

    return resolution.permission;
  }

  /**
   * Batch resolve permissions for multiple documents for performance
   */
  async batchResolveDocumentPermissions(userId: string, docIds: string[]): Promise<Record<string, PermissionLevel>> {
    if (docIds.length === 0) {
      return {};
    }

    // Get all documents with context in one query
    const documents = await this.prismaService.doc.findMany({
      where: { id: { in: docIds } },
      include: {
        subspace: {
          select: {
            id: true,
            type: true,
            subspaceAdminPermission: true,
            subspaceMemberPermission: true,
            nonSubspaceMemberPermission: true,
          },
        },
        workspace: {
          select: { id: true },
        },
      },
    });

    // Get all relevant permissions in bulk
    const workspaceIds = [...new Set(documents.map((doc) => doc.workspaceId))];
    const subspaceIds = [...new Set(documents.map((doc) => doc.subspaceId).filter((id): id is string => typeof id === "string" && !!id))];

    const [userPermissions, userWorkspaceRoles, userSubspaceRoles] = await Promise.all([
      this.getBulkUserPermissions(userId, docIds, subspaceIds, workspaceIds),
      this.getBulkUserWorkspaceRoles(userId, workspaceIds),
      this.getBulkUserSubspaceRoles(userId, subspaceIds),
    ]);

    // Resolve permissions for each document
    const result: Record<string, PermissionLevel> = {};

    for (const doc of documents) {
      // Author check
      if (doc.authorId === userId) {
        result[doc.id] = PermissionLevel.OWNER;
        continue;
      }

      const documentContext: DocumentContext = {
        id: doc.id,
        subspaceId: doc.subspaceId,
        workspaceId: doc.workspaceId,
        parentId: doc.parentId,
        authorId: doc.authorId,
        subspace: doc.subspace,
        workspace: doc.workspace,
      };

      const userContext: UserPermissionContext = {
        userId,
        workspaceRole: userWorkspaceRoles.get(doc.workspaceId),
        subspaceRole: doc.subspaceId ? userSubspaceRoles.get(doc.subspaceId) : undefined,
        isWorkspaceMember: userWorkspaceRoles.has(doc.workspaceId),
        isSubspaceMember: doc.subspaceId ? userSubspaceRoles.has(doc.subspaceId) : false,
      };

      const resolution = await this.resolvePermissionWithInheritanceBatch(userId, documentContext, userContext, userPermissions);

      result[doc.id] = resolution.permission;
    }

    return result;
  }

  /**
   * Resolve document permission with full inheritance including parent documents
   */
  async resolveDocumentPermissionWithInheritance(userId: string, doc: DocumentContext): Promise<PermissionLevel> {
    const userContext = await this.getUserPermissionContext(userId, doc.workspaceId, doc.subspaceId);
    const resolution = await this.resolvePermissionWithInheritance(userId, doc, userContext);

    // If no permission found and document has parent, check parent permission
    if (resolution.permission === PermissionLevel.NONE && doc.parentId) {
      const parentPermission = await this.resolveDocumentPermissionForUser(userId, doc.parentId);

      // Apply inheritance rules - child can have equal or lesser permission than parent
      if (parentPermission !== PermissionLevel.NONE) {
        return this.applyParentChildInheritanceRules(parentPermission);
      }
    }

    return resolution.permission;
  }

  /**
   * Core permission resolution logic with inheritance chain
   */
  private async resolvePermissionWithInheritance(userId: string, doc: DocumentContext, userContext: UserPermissionContext): Promise<PermissionResolution> {
    // 1. Check direct document permissions (DIRECT, GROUP)
    const directPermissions = await this.prismaService.unifiedPermission.findMany({
      where: {
        userId,
        resourceType: ResourceType.DOCUMENT,
        resourceId: doc.id,
        sourceType: { in: [SourceType.DIRECT, SourceType.GROUP] },
      },
      orderBy: { priority: "asc" },
    });

    if (directPermissions.length > 0) {
      const permission = directPermissions[0];
      return {
        permission: permission.permission,
        source: permission.sourceType,
        resourceType: ResourceType.DOCUMENT,
        resourceId: doc.id,
        priority: permission.priority,
      };
    }

    // 2. Check subspace-based permissions
    if (doc.subspaceId && doc.subspace) {
      const subspacePermission = await this.resolveSubspaceBasedDocumentPermission(userId, doc, userContext);

      if (subspacePermission.permission !== PermissionLevel.NONE) {
        return subspacePermission;
      }
    }

    // 3. Check workspace-based permissions
    const workspacePermission = await this.resolveWorkspaceBasedDocumentPermission(userId, doc, userContext);

    if (workspacePermission.permission !== PermissionLevel.NONE) {
      return workspacePermission;
    }

    // 4. Check guest permissions
    const guestPermissions = await this.prismaService.unifiedPermission.findMany({
      where: {
        userId,
        resourceType: ResourceType.DOCUMENT,
        resourceId: doc.id,
        sourceType: SourceType.GUEST,
      },
      orderBy: { priority: "asc" },
    });

    if (guestPermissions.length > 0) {
      const permission = guestPermissions[0];
      return {
        permission: permission.permission,
        source: permission.sourceType,
        resourceType: ResourceType.DOCUMENT,
        resourceId: doc.id,
        priority: permission.priority,
      };
    }

    // 5. No permissions found
    return {
      permission: PermissionLevel.NONE,
      source: SourceType.DIRECT,
      resourceType: ResourceType.DOCUMENT,
      resourceId: doc.id,
      priority: 999,
    };
  }

  /**
   * Batch version of permission resolution for performance
   */
  private async resolvePermissionWithInheritanceBatch(
    userId: string,
    doc: DocumentContext,
    userContext: UserPermissionContext,
    userPermissions: Map<string, UnifiedPermission[]>,
  ): Promise<PermissionResolution> {
    // 1. Check direct document permissions
    const docPermissionsKey = `${ResourceType.DOCUMENT}:${doc.id}`;
    const directPermissions = userPermissions.get(docPermissionsKey) || [];
    const directDocPerms = directPermissions.filter((p) => p.sourceType === SourceType.DIRECT || p.sourceType === SourceType.GROUP);

    if (directDocPerms.length > 0) {
      const permission = directDocPerms[0];
      return {
        permission: permission.permission,
        source: permission.sourceType,
        resourceType: ResourceType.DOCUMENT,
        resourceId: doc.id,
        priority: permission.priority,
      };
    }

    // 2. Check subspace-based permissions
    if (doc.subspaceId && doc.subspace) {
      const subspacePermission = this.resolveSubspaceBasedDocumentPermissionBatch(doc, userContext, userPermissions);

      if (subspacePermission.permission !== PermissionLevel.NONE) {
        return subspacePermission;
      }
    }

    // 3. Check workspace-based permissions
    const workspacePermission = this.resolveWorkspaceBasedDocumentPermissionBatch(doc, userContext, userPermissions);

    if (workspacePermission.permission !== PermissionLevel.NONE) {
      return workspacePermission;
    }

    // 4. Check guest permissions
    const guestPerms = directPermissions.filter((p) => p.sourceType === SourceType.GUEST);
    if (guestPerms.length > 0) {
      const permission = guestPerms[0];
      return {
        permission: permission.permission,
        source: permission.sourceType,
        resourceType: ResourceType.DOCUMENT,
        resourceId: doc.id,
        priority: permission.priority,
      };
    }

    return {
      permission: PermissionLevel.NONE,
      source: SourceType.DIRECT,
      resourceType: ResourceType.DOCUMENT,
      resourceId: doc.id,
      priority: 999,
    };
  }

  /**
   * Resolve subspace-based document permissions with subspace type consideration
   */
  private async resolveSubspaceBasedDocumentPermission(
    userId: string,
    doc: DocumentContext,
    userContext: UserPermissionContext,
  ): Promise<PermissionResolution> {
    if (!doc.subspaceId || !doc.subspace) {
      return {
        permission: PermissionLevel.NONE,
        source: SourceType.SUBSPACE_MEMBER,
        resourceType: ResourceType.DOCUMENT,
        resourceId: doc.id,
        priority: 999,
      };
    }

    // Check direct subspace permissions first
    const subspacePermissions = await this.prismaService.unifiedPermission.findMany({
      where: {
        userId,
        resourceType: ResourceType.SUBSPACE,
        resourceId: doc.subspaceId,
        sourceType: { in: [SourceType.DIRECT, SourceType.GROUP] },
      },
      orderBy: { priority: "asc" },
    });

    if (subspacePermissions.length > 0) {
      const permission = this.mapSubspacePermissionToDocumentPermission(subspacePermissions[0].permission);
      return {
        permission,
        source: subspacePermissions[0].sourceType,
        resourceType: ResourceType.SUBSPACE,
        resourceId: doc.subspaceId,
        priority: subspacePermissions[0].priority,
      };
    }

    // Apply subspace role-based permissions with subspace type consideration
    if (userContext.isSubspaceMember && userContext.subspaceRole) {
      const permission = userContext.subspaceRole === SubspaceRole.ADMIN ? doc.subspace.subspaceAdminPermission : doc.subspace.subspaceMemberPermission;

      const sourceType = userContext.subspaceRole === SubspaceRole.ADMIN ? SourceType.SUBSPACE_ADMIN : SourceType.SUBSPACE_MEMBER;

      return {
        permission: this.mapSubspacePermissionToDocumentPermission(permission),
        source: sourceType,
        resourceType: ResourceType.SUBSPACE,
        resourceId: doc.subspaceId,
        priority: userContext.subspaceRole === SubspaceRole.ADMIN ? 3 : 4,
      };
    }

    // Apply non-subspace member permissions based on subspace type
    if (userContext.isWorkspaceMember && !userContext.isSubspaceMember) {
      const permission = this.getNonSubspaceMemberPermission(doc.subspace);

      if (permission !== PermissionLevel.NONE) {
        return {
          permission: this.mapSubspacePermissionToDocumentPermission(permission),
          source: SourceType.WORKSPACE_MEMBER,
          resourceType: ResourceType.SUBSPACE,
          resourceId: doc.subspaceId,
          priority: 6,
        };
      }
    }

    return {
      permission: PermissionLevel.NONE,
      source: SourceType.SUBSPACE_MEMBER,
      resourceType: ResourceType.DOCUMENT,
      resourceId: doc.id,
      priority: 999,
    };
  }

  /**
   * Batch version of subspace-based permission resolution
   */
  private resolveSubspaceBasedDocumentPermissionBatch(
    doc: DocumentContext,
    userContext: UserPermissionContext,
    userPermissions: Map<string, UnifiedPermission[]>,
  ): PermissionResolution {
    if (!doc.subspaceId || !doc.subspace) {
      return {
        permission: PermissionLevel.NONE,
        source: SourceType.SUBSPACE_MEMBER,
        resourceType: ResourceType.DOCUMENT,
        resourceId: doc.id,
        priority: 999,
      };
    }

    // Check direct subspace permissions
    const subspacePermissionsKey = `${ResourceType.SUBSPACE}:${doc.subspaceId}`;
    const subspacePermissions = userPermissions.get(subspacePermissionsKey) || [];
    const directSubspacePerms = subspacePermissions.filter((p) => p.sourceType === SourceType.DIRECT || p.sourceType === SourceType.GROUP);

    if (directSubspacePerms.length > 0) {
      const permission = this.mapSubspacePermissionToDocumentPermission(directSubspacePerms[0].permission);
      return {
        permission,
        source: directSubspacePerms[0].sourceType,
        resourceType: ResourceType.SUBSPACE,
        resourceId: doc.subspaceId,
        priority: directSubspacePerms[0].priority,
      };
    }

    // Apply subspace role-based permissions
    if (userContext.isSubspaceMember && userContext.subspaceRole) {
      const permission = userContext.subspaceRole === SubspaceRole.ADMIN ? doc.subspace.subspaceAdminPermission : doc.subspace.subspaceMemberPermission;

      const sourceType = userContext.subspaceRole === SubspaceRole.ADMIN ? SourceType.SUBSPACE_ADMIN : SourceType.SUBSPACE_MEMBER;

      return {
        permission: this.mapSubspacePermissionToDocumentPermission(permission),
        source: sourceType,
        resourceType: ResourceType.SUBSPACE,
        resourceId: doc.subspaceId,
        priority: userContext.subspaceRole === SubspaceRole.ADMIN ? 3 : 4,
      };
    }

    // Apply non-subspace member permissions
    if (userContext.isWorkspaceMember && !userContext.isSubspaceMember) {
      const permission = this.getNonSubspaceMemberPermission(doc.subspace);

      if (permission !== PermissionLevel.NONE) {
        return {
          permission: this.mapSubspacePermissionToDocumentPermission(permission),
          source: SourceType.WORKSPACE_MEMBER,
          resourceType: ResourceType.SUBSPACE,
          resourceId: doc.subspaceId,
          priority: 6,
        };
      }
    }

    return {
      permission: PermissionLevel.NONE,
      source: SourceType.SUBSPACE_MEMBER,
      resourceType: ResourceType.DOCUMENT,
      resourceId: doc.id,
      priority: 999,
    };
  }

  /**
   * Resolve workspace-based document permissions
   */
  private async resolveWorkspaceBasedDocumentPermission(
    userId: string,
    doc: DocumentContext,
    userContext: UserPermissionContext,
  ): Promise<PermissionResolution> {
    // Check direct workspace permissions
    const workspacePermissions = await this.prismaService.unifiedPermission.findMany({
      where: {
        userId,
        resourceType: ResourceType.WORKSPACE,
        resourceId: doc.workspaceId,
      },
      orderBy: { priority: "asc" },
    });

    if (workspacePermissions.length > 0) {
      const permission = this.mapWorkspacePermissionToDocumentPermission(workspacePermissions[0].permission);
      return {
        permission,
        source: workspacePermissions[0].sourceType,
        resourceType: ResourceType.WORKSPACE,
        resourceId: doc.workspaceId,
        priority: workspacePermissions[0].priority,
      };
    }

    return {
      permission: PermissionLevel.NONE,
      source: SourceType.WORKSPACE_MEMBER,
      resourceType: ResourceType.DOCUMENT,
      resourceId: doc.id,
      priority: 999,
    };
  }

  /**
   * Batch version of workspace-based permission resolution
   */
  private resolveWorkspaceBasedDocumentPermissionBatch(
    doc: DocumentContext,
    userContext: UserPermissionContext,
    userPermissions: Map<string, UnifiedPermission[]>,
  ): PermissionResolution {
    const workspacePermissionsKey = `${ResourceType.WORKSPACE}:${doc.workspaceId}`;
    const workspacePermissions = userPermissions.get(workspacePermissionsKey) || [];

    if (workspacePermissions.length > 0) {
      const permission = this.mapWorkspacePermissionToDocumentPermission(workspacePermissions[0].permission);
      return {
        permission,
        source: workspacePermissions[0].sourceType,
        resourceType: ResourceType.WORKSPACE,
        resourceId: doc.workspaceId,
        priority: workspacePermissions[0].priority,
      };
    }

    return {
      permission: PermissionLevel.NONE,
      source: SourceType.WORKSPACE_MEMBER,
      resourceType: ResourceType.DOCUMENT,
      resourceId: doc.id,
      priority: 999,
    };
  }

  /**
   * Helper methods for permission mapping and context
   */
  private async getDocumentWithContext(docId: string): Promise<DocumentContext | null> {
    const doc = await this.prismaService.doc.findUnique({
      where: { id: docId },
      include: {
        subspace: {
          select: {
            id: true,
            type: true,
            subspaceAdminPermission: true,
            subspaceMemberPermission: true,
            nonSubspaceMemberPermission: true,
          },
        },
        workspace: {
          select: { id: true },
        },
      },
    });

    if (!doc) return null;

    return {
      id: doc.id,
      subspaceId: doc.subspaceId,
      workspaceId: doc.workspaceId,
      parentId: doc.parentId,
      authorId: doc.authorId,
      subspace: doc.subspace,
      workspace: doc.workspace,
    };
  }

  private async getUserPermissionContext(userId: string, workspaceId: string, subspaceId?: string | null): Promise<UserPermissionContext> {
    const [workspaceMember, subspaceMember] = await Promise.all([
      this.prismaService.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
      }),
      subspaceId
        ? this.prismaService.subspaceMember.findUnique({
            where: { subspaceId_userId: { subspaceId, userId } },
          })
        : null,
    ]);

    return {
      userId,
      workspaceRole: workspaceMember?.role,
      subspaceRole: subspaceMember?.role,
      isWorkspaceMember: !!workspaceMember,
      isSubspaceMember: !!subspaceMember,
    };
  }

  private async getBulkUserPermissions(
    userId: string,
    docIds: string[],
    subspaceIds: string[],
    workspaceIds: string[],
  ): Promise<Map<string, UnifiedPermission[]>> {
    const permissions = await this.prismaService.unifiedPermission.findMany({
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

    const permissionMap = new Map<string, UnifiedPermission[]>();

    for (const permission of permissions) {
      const key = `${permission.resourceType}:${permission.resourceId}`;
      if (!permissionMap.has(key)) {
        permissionMap.set(key, []);
      }
      permissionMap.get(key)!.push(permission);
    }

    return permissionMap;
  }

  private async getBulkUserWorkspaceRoles(userId: string, workspaceIds: string[]): Promise<Map<string, WorkspaceRole>> {
    const members = await this.prismaService.workspaceMember.findMany({
      where: { userId, workspaceId: { in: workspaceIds } },
    });

    return new Map(members.map((member) => [member.workspaceId, member.role]));
  }

  private async getBulkUserSubspaceRoles(userId: string, subspaceIds: string[]): Promise<Map<string, SubspaceRole>> {
    if (subspaceIds.length === 0) return new Map();

    const members = await this.prismaService.subspaceMember.findMany({
      where: { userId, subspaceId: { in: subspaceIds } },
    });

    return new Map(members.map((member) => [member.subspaceId, member.role]));
  }

  private getNonSubspaceMemberPermission(subspace: {
    type: SubspaceType;
    nonSubspaceMemberPermission: PermissionLevel;
  }): PermissionLevel {
    switch (subspace.type) {
      case SubspaceType.WORKSPACE_WIDE:
        // All workspace members are automatically subspace members
        return PermissionLevel.NONE;
      case SubspaceType.PUBLIC:
        return subspace.nonSubspaceMemberPermission;
      case SubspaceType.INVITE_ONLY:
      case SubspaceType.PRIVATE:
      case SubspaceType.PERSONAL:
        return PermissionLevel.NONE;
      default:
        return PermissionLevel.NONE;
    }
  }

  private mapSubspacePermissionToDocumentPermission(permission: PermissionLevel): PermissionLevel {
    // Subspace permissions map directly to document permissions
    return permission;
  }

  private mapWorkspacePermissionToDocumentPermission(permission: PermissionLevel): PermissionLevel {
    switch (permission) {
      case PermissionLevel.OWNER:
      case PermissionLevel.MANAGE:
        return PermissionLevel.MANAGE;
      case PermissionLevel.EDIT:
        return PermissionLevel.READ;
      case PermissionLevel.COMMENT:
      case PermissionLevel.READ:
        return PermissionLevel.READ;
      default:
        return PermissionLevel.NONE;
    }
  }

  private applyParentChildInheritanceRules(parentPermission: PermissionLevel): PermissionLevel {
    // Child documents inherit at most READ permission from parent
    // This prevents permission escalation through inheritance
    switch (parentPermission) {
      case PermissionLevel.OWNER:
      case PermissionLevel.MANAGE:
      case PermissionLevel.EDIT:
        return PermissionLevel.READ;
      case PermissionLevel.COMMENT:
        return PermissionLevel.COMMENT;
      case PermissionLevel.READ:
        return PermissionLevel.READ;
      default:
        return PermissionLevel.NONE;
    }
  }

  /**
   * Get enhanced document permission with full inheritance and context information
   */
  async getEnhancedDocumentPermission(
    userId: string,
    documentId: string,
    options: {
      includeInheritance?: boolean;
      includeContext?: boolean;
    } = {},
  ): Promise<{
    permissionLevel: PermissionLevel;
    source: "DIRECT" | "GROUP" | "SUBSPACE" | "WORKSPACE" | "GUEST" | "PARENT";
    inheritedFrom?: string;
    effectivePermissions: Record<string, boolean>;
    subspaceContext?: {
      subspaceId: string;
      userRole: "ADMIN" | "MEMBER" | null;
      subspaceAdminPermission: PermissionLevel;
      subspaceMemberPermission: PermissionLevel;
      nonSubspaceMemberPermission: PermissionLevel;
    };
    workspaceContext?: {
      workspaceId: string;
      userRole: "OWNER" | "ADMIN" | "MEMBER";
    };
    parentContext?: {
      parentDocumentId: string;
      inheritedPermission: PermissionLevel;
    };
    expiresAt?: string;
  }> {
    // Get document with full context
    const document = await this.getDocumentWithContext(documentId);
    if (!document) {
      return {
        permissionLevel: PermissionLevel.NONE,
        source: "DIRECT",
        effectivePermissions: {},
      };
    }

    // If user is the author, they always have OWNER permission
    if (document.authorId === userId) {
      return {
        permissionLevel: PermissionLevel.OWNER,
        source: "DIRECT",
        effectivePermissions: this.getEffectivePermissions(PermissionLevel.OWNER),
      };
    }

    // Get user's permission context
    const userContext = await this.getUserPermissionContext(userId, document.workspaceId, document.subspaceId);

    // Resolve permission through inheritance chain
    const resolution = await this.resolvePermissionWithInheritance(userId, document, userContext);

    const response: any = {
      permissionLevel: resolution.permission,
      source: this.mapSourceTypeToClientSource(resolution.source),
      effectivePermissions: this.getEffectivePermissions(resolution.permission),
    };

    // Add inheritance information if requested
    if (options.includeInheritance && resolution.resourceId !== documentId) {
      response.inheritedFrom = resolution.resourceId;
    }

    // Add context information if requested
    if (options.includeContext) {
      // Add subspace context
      if (document.subspace) {
        response.subspaceContext = {
          subspaceId: document.subspace.id,
          userRole: userContext.subspaceRole === SubspaceRole.ADMIN ? "ADMIN" : userContext.subspaceRole === SubspaceRole.MEMBER ? "MEMBER" : null,
          subspaceAdminPermission: document.subspace.subspaceAdminPermission,
          subspaceMemberPermission: document.subspace.subspaceMemberPermission,
          nonSubspaceMemberPermission: document.subspace.nonSubspaceMemberPermission,
        };
      }

      // Add workspace context
      response.workspaceContext = {
        workspaceId: document.workspaceId,
        userRole: userContext.workspaceRole === WorkspaceRole.OWNER ? "OWNER" : userContext.workspaceRole === WorkspaceRole.ADMIN ? "ADMIN" : "MEMBER",
      };

      // Add parent context if document has a parent
      if (document.parentId) {
        const parentPermission = await this.resolveDocumentPermissionForUser(userId, document.parentId);
        response.parentContext = {
          parentDocumentId: document.parentId,
          inheritedPermission: parentPermission,
        };
      }
    }

    return response;
  }

  /**
   * Get batch enhanced document permissions with full inheritance and context information
   */
  async getBatchDocumentPermissions(
    userId: string,
    documentIds: string[],
    options: {
      includeInheritance?: boolean;
      includeContext?: boolean;
    } = {},
  ): Promise<{
    permissions: Record<string, PermissionLevel>;
    contexts: Record<
      string,
      Omit<
        {
          permissionLevel: PermissionLevel;
          source: "DIRECT" | "GROUP" | "SUBSPACE" | "WORKSPACE" | "GUEST" | "PARENT";
          inheritedFrom?: string;
          effectivePermissions: Record<string, boolean>;
          subspaceContext?: {
            subspaceId: string;
            userRole: "ADMIN" | "MEMBER" | null;
            subspaceAdminPermission: PermissionLevel;
            subspaceMemberPermission: PermissionLevel;
            nonSubspaceMemberPermission: PermissionLevel;
          };
          workspaceContext?: {
            workspaceId: string;
            userRole: "OWNER" | "ADMIN" | "MEMBER";
          };
          parentContext?: {
            parentDocumentId: string;
            inheritedPermission: PermissionLevel;
          };
          expiresAt?: string;
        },
        "permissionLevel"
      >
    >;
  }> {
    if (documentIds.length === 0) {
      return {
        permissions: {},
        contexts: {},
      };
    }

    // Get all documents with context in one query
    const documents = await this.prismaService.doc.findMany({
      where: { id: { in: documentIds } },
      include: {
        subspace: {
          select: {
            id: true,
            type: true,
            subspaceAdminPermission: true,
            subspaceMemberPermission: true,
            nonSubspaceMemberPermission: true,
          },
        },
        workspace: {
          select: { id: true },
        },
      },
    });

    // Get all relevant permissions in bulk
    const workspaceIds = [...new Set(documents.map((doc) => doc.workspaceId))];
    const subspaceIds = [...new Set(documents.map((doc) => doc.subspaceId).filter((id): id is string => typeof id === "string" && !!id))];

    const [userPermissions, userWorkspaceRoles, userSubspaceRoles] = await Promise.all([
      this.getBulkUserPermissions(userId, documentIds, workspaceIds, subspaceIds),
      this.getBulkUserWorkspaceRoles(userId, workspaceIds),
      this.getBulkUserSubspaceRoles(userId, subspaceIds),
    ]);

    const permissions: Record<string, PermissionLevel> = {};
    const contexts: Record<string, any> = {};

    for (const document of documents) {
      const docId = document.id;

      // If user is the author, they always have OWNER permission
      if (document.authorId === userId) {
        permissions[docId] = PermissionLevel.OWNER;
        contexts[docId] = {
          source: "DIRECT" as const,
          effectivePermissions: this.getEffectivePermissions(PermissionLevel.OWNER),
        };
        continue;
      }

      // Get user's permission context for this document
      const userContext = {
        userId,
        workspaceRole: userWorkspaceRoles.get(document.workspaceId),
        subspaceRole: document.subspaceId ? userSubspaceRoles.get(document.subspaceId) : undefined,
        isWorkspaceMember: !!userWorkspaceRoles.get(document.workspaceId),
        isSubspaceMember: document.subspaceId ? !!userSubspaceRoles.get(document.subspaceId) : false,
      };

      // Resolve permission through inheritance chain
      const resolution = await this.resolvePermissionWithInheritance(userId, document, userContext);

      permissions[docId] = resolution.permission;

      const context: any = {
        source: this.mapSourceTypeToClientSource(resolution.source),
        effectivePermissions: this.getEffectivePermissions(resolution.permission),
      };

      // Add inheritance information if requested
      if (options.includeInheritance && resolution.resourceId !== docId) {
        context.inheritedFrom = resolution.resourceId;
      }

      // Add context information if requested
      if (options.includeContext) {
        // Add subspace context
        if (document.subspace) {
          context.subspaceContext = {
            subspaceId: document.subspace.id,
            userRole: userContext.subspaceRole === SubspaceRole.ADMIN ? "ADMIN" : userContext.subspaceRole === SubspaceRole.MEMBER ? "MEMBER" : null,
            subspaceAdminPermission: document.subspace.subspaceAdminPermission,
            subspaceMemberPermission: document.subspace.subspaceMemberPermission,
            nonSubspaceMemberPermission: document.subspace.nonSubspaceMemberPermission,
          };
        }

        // Add workspace context
        context.workspaceContext = {
          workspaceId: document.workspaceId,
          userRole: userContext.workspaceRole === WorkspaceRole.OWNER ? "OWNER" : userContext.workspaceRole === WorkspaceRole.ADMIN ? "ADMIN" : "MEMBER",
        };

        // Add parent context if document has a parent
        if (document.parentId) {
          const parentPermission = permissions[document.parentId] || (await this.resolveDocumentPermissionForUser(userId, document.parentId));
          context.parentContext = {
            parentDocumentId: document.parentId,
            inheritedPermission: parentPermission,
          };
        }
      }

      contexts[docId] = context;
    }

    return {
      permissions,
      contexts,
    };
  }

  private mapSourceTypeToClientSource(source: SourceType): "DIRECT" | "GROUP" | "SUBSPACE" | "WORKSPACE" | "GUEST" | "PARENT" {
    switch (source) {
      case SourceType.DIRECT:
        return "DIRECT";
      case SourceType.GROUP:
        return "GROUP";
      case SourceType.SUBSPACE_ADMIN:
      case SourceType.SUBSPACE_MEMBER:
        return "SUBSPACE";
      case SourceType.WORKSPACE_ADMIN:
      case SourceType.WORKSPACE_MEMBER:
        return "WORKSPACE";
      case SourceType.GUEST:
        return "GUEST";
      // Note: PARENT source type doesn't exist in the enum, using DIRECT as fallback
      default:
        return "DIRECT";
    }
  }

  private getEffectivePermissions(permissionLevel: PermissionLevel): Record<string, boolean> {
    const permissions: Record<string, boolean> = {
      canRead: false,
      canComment: false,
      canEdit: false,
      canManage: false,
      canDelete: false,
      canShare: false,
    };

    switch (permissionLevel) {
      case PermissionLevel.OWNER:
        permissions.canRead = true;
        permissions.canComment = true;
        permissions.canEdit = true;
        permissions.canManage = true;
        permissions.canDelete = true;
        permissions.canShare = true;
        break;
      case PermissionLevel.MANAGE:
        permissions.canRead = true;
        permissions.canComment = true;
        permissions.canEdit = true;
        permissions.canManage = true;
        permissions.canDelete = false;
        permissions.canShare = true;
        break;
      case PermissionLevel.EDIT:
        permissions.canRead = true;
        permissions.canComment = true;
        permissions.canEdit = true;
        permissions.canManage = false;
        permissions.canDelete = false;
        permissions.canShare = false;
        break;
      case PermissionLevel.COMMENT:
        permissions.canRead = true;
        permissions.canComment = true;
        permissions.canEdit = false;
        permissions.canManage = false;
        permissions.canDelete = false;
        permissions.canShare = false;
        break;
      case PermissionLevel.READ:
        permissions.canRead = true;
        permissions.canComment = false;
        permissions.canEdit = false;
        permissions.canManage = false;
        permissions.canDelete = false;
        permissions.canShare = false;
        break;
      default:
        // NONE - all permissions are false
        break;
    }

    return permissions;
  }
}
