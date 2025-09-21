import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { EnhancedPermissionService } from "./enhanced-permission.service";
import { SubspacePermissionService } from "./subspace-permission.service";
import { DocumentInheritanceService } from "./document-inheritance.service";
import { PermissionLevel, ResourceType } from "@idea/contracts";

interface PermissionContext {
  userId: string;
  resourceType: ResourceType;
  resourceId: string;
  permission: PermissionLevel;
  abilities: {
    read: boolean;
    update: boolean;
    delete: boolean;
    share: boolean;
    comment: boolean;
  };
  lastUpdated: Date;
}

interface CacheEntry {
  context: PermissionContext;
  expiresAt: Date;
}

@Injectable()
export class PermissionContextService {
  private permissionCache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly prismaService: PrismaService,
    private readonly enhancedPermissionService: EnhancedPermissionService,
    private readonly subspacePermissionService: SubspacePermissionService,
    private readonly documentInheritanceService: DocumentInheritanceService,
  ) {}

  /**
   * Get permission context for a resource with caching
   */
  async getPermissionContext(userId: string, resourceType: ResourceType, resourceId: string): Promise<PermissionContext> {
    const cacheKey = this.getCacheKey(userId, resourceType, resourceId);
    const cached = this.permissionCache.get(cacheKey);

    // Return cached result if valid
    if (cached && cached.expiresAt > new Date()) {
      return cached.context;
    }

    // Resolve permission and create context
    const context = await this.resolvePermissionContext(userId, resourceType, resourceId);

    // Cache the result
    this.permissionCache.set(cacheKey, {
      context,
      expiresAt: new Date(Date.now() + this.CACHE_TTL_MS),
    });

    return context;
  }

  /**
   * Get batch permission contexts for multiple resources
   */
  async getBatchPermissionContexts(userId: string, resourceType: ResourceType, resourceIds: string[]): Promise<Record<string, PermissionContext>> {
    if (resourceIds.length === 0) {
      return {};
    }

    const result: Record<string, PermissionContext> = {};
    const uncachedIds: string[] = [];

    // Check cache first
    for (const resourceId of resourceIds) {
      const cacheKey = this.getCacheKey(userId, resourceType, resourceId);
      const cached = this.permissionCache.get(cacheKey);

      if (cached && cached.expiresAt > new Date()) {
        result[resourceId] = cached.context;
      } else {
        uncachedIds.push(resourceId);
      }
    }

    // Resolve uncached permissions in batch
    if (uncachedIds.length > 0) {
      const batchContexts = await this.resolveBatchPermissionContexts(userId, resourceType, uncachedIds);

      // Cache and add to result
      for (const [resourceId, context] of Object.entries(batchContexts)) {
        const cacheKey = this.getCacheKey(userId, resourceType, resourceId);
        this.permissionCache.set(cacheKey, {
          context,
          expiresAt: new Date(Date.now() + this.CACHE_TTL_MS),
        });
        result[resourceId] = context;
      }
    }

    return result;
  }

  /**
   * Invalidate permission cache for a user and resource
   */
  invalidatePermissionCache(userId: string, resourceType: ResourceType, resourceId: string): void {
    const cacheKey = this.getCacheKey(userId, resourceType, resourceId);
    this.permissionCache.delete(cacheKey);
  }

  /**
   * Invalidate all permission cache for a user
   */
  invalidateUserPermissionCache(userId: string): void {
    const userPrefix = `${userId}:`;
    for (const [key] of this.permissionCache) {
      if (key.startsWith(userPrefix)) {
        this.permissionCache.delete(key);
      }
    }
  }

  /**
   * Invalidate permission cache for all users affected by a resource change
   */
  async invalidateResourcePermissionCache(resourceType: ResourceType, resourceId: string): Promise<void> {
    // Get all users who might have permissions on this resource
    const affectedUsers = await this.getAffectedUsersByResource(resourceType, resourceId);

    for (const userId of affectedUsers) {
      this.invalidatePermissionCache(userId, resourceType, resourceId);

      // If it's a subspace or workspace change, also invalidate document permissions
      if (resourceType === ResourceType.SUBSPACE || resourceType === ResourceType.WORKSPACE) {
        await this.invalidateRelatedDocumentPermissions(userId, resourceType, resourceId);
      }
    }
  }

  /**
   * Clean up expired cache entries
   */
  cleanupExpiredCache(): void {
    const now = new Date();
    for (const [key, entry] of this.permissionCache) {
      if (entry.expiresAt <= now) {
        this.permissionCache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): { size: number; hitRate?: number } {
    return {
      size: this.permissionCache.size,
      // Hit rate would require tracking hits/misses
    };
  }

  /**
   * Private helper methods
   */
  private async resolvePermissionContext(userId: string, resourceType: ResourceType, resourceId: string): Promise<PermissionContext> {
    let permission: PermissionLevel;
    let abilities: PermissionContext["abilities"];

    switch (resourceType) {
      case ResourceType.DOCUMENT:
        permission = await this.enhancedPermissionService.resolveDocumentPermissionForUser(userId, resourceId);
        abilities = this.mapDocumentPermissionToAbilities(permission, await this.isDocumentAuthor(userId, resourceId));
        break;

      case ResourceType.SUBSPACE:
        permission = await this.subspacePermissionService.getEffectiveSubspacePermissionForUser(userId, resourceId);
        abilities = this.mapSubspacePermissionToAbilities(permission);
        break;

      case ResourceType.WORKSPACE:
        permission = await this.getWorkspacePermission(userId, resourceId);
        abilities = this.mapWorkspacePermissionToAbilities(permission);
        break;

      default:
        permission = PermissionLevel.NONE;
        abilities = this.getDefaultAbilities();
    }

    return {
      userId,
      resourceType,
      resourceId,
      permission,
      abilities,
      lastUpdated: new Date(),
    };
  }

  private async resolveBatchPermissionContexts(userId: string, resourceType: ResourceType, resourceIds: string[]): Promise<Record<string, PermissionContext>> {
    const result: Record<string, PermissionContext> = {};

    switch (resourceType) {
      case ResourceType.DOCUMENT: {
        const batchPermissions = await this.enhancedPermissionService.batchResolveDocumentPermissions(userId, resourceIds);
        const authorshipMap = await this.getBatchDocumentAuthorship(userId, resourceIds);

        for (const resourceId of resourceIds) {
          const permission = batchPermissions[resourceId] || PermissionLevel.NONE;
          const isAuthor = authorshipMap[resourceId] || false;
          const abilities = this.mapDocumentPermissionToAbilities(permission, isAuthor);

          result[resourceId] = {
            userId,
            resourceType,
            resourceId,
            permission,
            abilities,
            lastUpdated: new Date(),
          };
        }
        break;
      }

      case ResourceType.SUBSPACE: {
        for (const resourceId of resourceIds) {
          const permission = await this.subspacePermissionService.getEffectiveSubspacePermissionForUser(userId, resourceId);
          const abilities = this.mapSubspacePermissionToAbilities(permission);

          result[resourceId] = {
            userId,
            resourceType,
            resourceId,
            permission,
            abilities,
            lastUpdated: new Date(),
          };
        }
        break;
      }

      case ResourceType.WORKSPACE: {
        for (const resourceId of resourceIds) {
          const permission = await this.getWorkspacePermission(userId, resourceId);
          const abilities = this.mapWorkspacePermissionToAbilities(permission);

          result[resourceId] = {
            userId,
            resourceType,
            resourceId,
            permission,
            abilities,
            lastUpdated: new Date(),
          };
        }
        break;
      }
    }

    return result;
  }

  private async getAffectedUsersByResource(resourceType: ResourceType, resourceId: string): Promise<string[]> {
    const userIds = new Set<string>();

    // Get users with direct permissions
    const directPermissions = await this.prismaService.unifiedPermission.findMany({
      where: { resourceType, resourceId },
      select: { userId: true },
    });

    directPermissions.forEach((perm) => {
      if (perm.userId) userIds.add(perm.userId);
    });

    // Get users affected by inheritance based on resource type
    switch (resourceType) {
      case ResourceType.WORKSPACE: {
        const workspaceMembers = await this.prismaService.workspaceMember.findMany({
          where: { workspaceId: resourceId },
          select: { userId: true },
        });
        workspaceMembers.forEach((member) => userIds.add(member.userId));
        break;
      }

      case ResourceType.SUBSPACE: {
        const subspaceMembers = await this.prismaService.subspaceMember.findMany({
          where: { subspaceId: resourceId },
          select: { userId: true },
        });
        subspaceMembers.forEach((member) => userIds.add(member.userId));

        // Also get workspace members for non-subspace member permissions
        const subspace = await this.prismaService.subspace.findUnique({
          where: { id: resourceId },
          select: { workspaceId: true },
        });
        if (subspace) {
          const wsMembers = await this.prismaService.workspaceMember.findMany({
            where: { workspaceId: subspace.workspaceId },
            select: { userId: true },
          });
          wsMembers.forEach((member) => userIds.add(member.userId));
        }
        break;
      }

      case ResourceType.DOCUMENT: {
        // For documents, check parent permissions and subspace/workspace membership
        const document = await this.prismaService.doc.findUnique({
          where: { id: resourceId },
          select: { authorId: true, subspaceId: true, workspaceId: true },
        });
        if (document) {
          userIds.add(document.authorId);

          if (document.subspaceId) {
            const docSubspaceMembers = await this.prismaService.subspaceMember.findMany({
              where: { subspaceId: document.subspaceId },
              select: { userId: true },
            });
            docSubspaceMembers.forEach((member) => userIds.add(member.userId));
          }

          const docWorkspaceMembers = await this.prismaService.workspaceMember.findMany({
            where: { workspaceId: document.workspaceId },
            select: { userId: true },
          });
          docWorkspaceMembers.forEach((member) => userIds.add(member.userId));
        }
        break;
      }
    }

    return Array.from(userIds);
  }

  private async invalidateRelatedDocumentPermissions(userId: string, resourceType: ResourceType, resourceId: string): Promise<void> {
    if (resourceType === ResourceType.SUBSPACE) {
      // Invalidate all documents in this subspace
      const documents = await this.prismaService.doc.findMany({
        where: { subspaceId: resourceId },
        select: { id: true },
      });

      for (const doc of documents) {
        this.invalidatePermissionCache(userId, ResourceType.DOCUMENT, doc.id);
      }
    } else if (resourceType === ResourceType.WORKSPACE) {
      // Invalidate all documents in this workspace
      const documents = await this.prismaService.doc.findMany({
        where: { workspaceId: resourceId },
        select: { id: true },
      });

      for (const doc of documents) {
        this.invalidatePermissionCache(userId, ResourceType.DOCUMENT, doc.id);
      }
    }
  }

  private async isDocumentAuthor(userId: string, docId: string): Promise<boolean> {
    const doc = await this.prismaService.doc.findUnique({
      where: { id: docId },
      select: { authorId: true },
    });
    return doc?.authorId === userId;
  }

  private async getBatchDocumentAuthorship(userId: string, docIds: string[]): Promise<Record<string, boolean>> {
    const documents = await this.prismaService.doc.findMany({
      where: { id: { in: docIds } },
      select: { id: true, authorId: true },
    });

    const result: Record<string, boolean> = {};
    for (const doc of documents) {
      result[doc.id] = doc.authorId === userId;
    }

    return result;
  }

  private async getWorkspacePermission(userId: string, workspaceId: string): Promise<PermissionLevel> {
    const workspaceMember = await this.prismaService.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!workspaceMember) {
      return PermissionLevel.NONE;
    }

    // Map workspace role to permission level
    switch (workspaceMember.role) {
      case "OWNER":
        return PermissionLevel.OWNER;
      case "ADMIN":
        return PermissionLevel.MANAGE;
      case "MEMBER":
        return PermissionLevel.READ;
      default:
        return PermissionLevel.NONE;
    }
  }

  private mapDocumentPermissionToAbilities(permission: PermissionLevel, isAuthor: boolean): PermissionContext["abilities"] {
    // Authors always have full permissions
    if (isAuthor) {
      return {
        read: true,
        update: true,
        delete: true,
        share: true,
        comment: true,
      };
    }

    switch (permission) {
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
        return this.getDefaultAbilities();
    }
  }

  private mapSubspacePermissionToAbilities(permission: PermissionLevel): PermissionContext["abilities"] {
    switch (permission) {
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
        return this.getDefaultAbilities();
    }
  }

  private mapWorkspacePermissionToAbilities(permission: PermissionLevel): PermissionContext["abilities"] {
    switch (permission) {
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
      case PermissionLevel.READ:
        return {
          read: true,
          update: false,
          delete: false,
          share: false,
          comment: false,
        };
      default:
        return this.getDefaultAbilities();
    }
  }

  private getDefaultAbilities(): PermissionContext["abilities"] {
    return {
      read: false,
      update: false,
      delete: false,
      share: false,
      comment: false,
    };
  }

  private getCacheKey(userId: string, resourceType: ResourceType, resourceId: string): string {
    return `${userId}:${resourceType}:${resourceId}`;
  }
}
