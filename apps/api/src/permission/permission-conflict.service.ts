import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { PermissionLevel, ResourceType, SourceType, UnifiedPermission } from "@prisma/client";

interface PermissionConflict {
  userId: string;
  resourceId: string;
  resourceType: ResourceType;
  conflictingPermissions: UnifiedPermission[];
  recommendedResolution: PermissionLevel;
  conflictType: ConflictType;
  description: string;
}

enum ConflictType {
  PRIORITY_CONFLICT = "PRIORITY_CONFLICT", // Same priority but different permissions
  SOURCE_CONFLICT = "SOURCE_CONFLICT", // Different sources with conflicting permissions
  INHERITANCE_CONFLICT = "INHERITANCE_CONFLICT", // Parent-child permission conflicts
  TEMPORAL_CONFLICT = "TEMPORAL_CONFLICT", // Time-based permission conflicts
}

/**
 * Service to resolve permission conflicts and ensure consistent behavior
 * Handles edge cases where permissions might conflict due to system changes
 */
@Injectable()
export class PermissionConflictService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Permission level hierarchy for conflict resolution
   * Higher values take precedence in conflicts
   */
  private readonly permissionHierarchy: Record<PermissionLevel, number> = {
    [PermissionLevel.NONE]: 0,
    [PermissionLevel.READ]: 1,
    [PermissionLevel.COMMENT]: 2,
    [PermissionLevel.EDIT]: 3,
    [PermissionLevel.MANAGE]: 4,
    [PermissionLevel.OWNER]: 5,
  };

  /**
   * Source type priority for conflict resolution
   * Lower values have higher priority (1 = highest priority)
   */
  private readonly sourcePriority: Record<SourceType, number> = {
    [SourceType.DIRECT]: 1,
    [SourceType.GROUP]: 2,
    [SourceType.SUBSPACE_ADMIN]: 3,
    [SourceType.SUBSPACE_MEMBER]: 4,
    [SourceType.WORKSPACE_ADMIN]: 5,
    [SourceType.WORKSPACE_MEMBER]: 6,
    [SourceType.GUEST]: 7,
  };

  /**
   * Detect and resolve permission conflicts for a specific user and resource
   */
  async detectAndResolveConflicts(
    userId: string,
    resourceType: ResourceType,
    resourceId: string,
  ): Promise<{
    hadConflicts: boolean;
    resolvedPermission: PermissionLevel;
    conflicts: PermissionConflict[];
  }> {
    try {
      // 1. Get all permissions for the user and resource
      const permissions = await this.prismaService.unifiedPermission.findMany({
        where: {
          userId,
          resourceType,
          resourceId,
        },
        orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
      });

      if (permissions.length === 0) {
        return {
          hadConflicts: false,
          resolvedPermission: PermissionLevel.NONE,
          conflicts: [],
        };
      }

      if (permissions.length === 1) {
        return {
          hadConflicts: false,
          resolvedPermission: permissions[0].permission,
          conflicts: [],
        };
      }

      // 2. Detect conflicts
      const conflicts = this.detectConflicts(permissions);

      // 3. Resolve conflicts if any exist
      let resolvedPermission: PermissionLevel;
      if (conflicts.length > 0) {
        resolvedPermission = this.resolveConflicts(permissions, conflicts);

        // 4. Clean up conflicting permissions in database
        await this.cleanupConflictingPermissions(permissions, resolvedPermission);
      } else {
        // No conflicts, use highest priority permission
        resolvedPermission = permissions[0].permission;
      }

      return {
        hadConflicts: conflicts.length > 0,
        resolvedPermission,
        conflicts,
      };
    } catch (error) {
      console.error(`Error detecting and resolving conflicts:`, error);
      throw error;
    }
  }

  /**
   * Detect various types of conflicts in permissions
   */
  private detectConflicts(permissions: UnifiedPermission[]): PermissionConflict[] {
    const conflicts: PermissionConflict[] = [];

    // Group permissions by priority
    const permissionsByPriority = new Map<number, UnifiedPermission[]>();
    permissions.forEach((perm) => {
      if (!permissionsByPriority.has(perm.priority)) {
        permissionsByPriority.set(perm.priority, []);
      }
      permissionsByPriority.get(perm.priority)!.push(perm);
    });

    // Check for priority conflicts (same priority, different permissions)
    permissionsByPriority.forEach((perms, priority) => {
      if (perms.length > 1) {
        const uniquePermissions = new Set(perms.map((p) => p.permission));
        if (uniquePermissions.size > 1) {
          conflicts.push({
            userId: perms[0].userId!,
            resourceId: perms[0].resourceId,
            resourceType: perms[0].resourceType,
            conflictingPermissions: perms,
            recommendedResolution: this.getHighestPermission(perms),
            conflictType: ConflictType.PRIORITY_CONFLICT,
            description: `Multiple permissions with same priority ${priority} but different levels: ${Array.from(uniquePermissions).join(", ")}`,
          });
        }
      }
    });

    // Check for source conflicts (illogical source combinations)
    const sourceTypes = permissions.map((p) => p.sourceType);
    const hasDirectAndGroup = sourceTypes.includes(SourceType.DIRECT) && sourceTypes.includes(SourceType.GROUP);

    if (hasDirectAndGroup) {
      const directPerms = permissions.filter((p) => p.sourceType === SourceType.DIRECT);
      const groupPerms = permissions.filter((p) => p.sourceType === SourceType.GROUP);

      // Check if they have different permission levels
      const directLevels = new Set(directPerms.map((p) => p.permission));
      const groupLevels = new Set(groupPerms.map((p) => p.permission));

      if (directLevels.size === 1 && groupLevels.size === 1) {
        const directLevel = Array.from(directLevels)[0];
        const groupLevel = Array.from(groupLevels)[0];

        if (directLevel !== groupLevel) {
          conflicts.push({
            userId: permissions[0].userId!,
            resourceId: permissions[0].resourceId,
            resourceType: permissions[0].resourceType,
            conflictingPermissions: [...directPerms, ...groupPerms],
            recommendedResolution: this.getHigherPermissionLevel(directLevel, groupLevel),
            conflictType: ConflictType.SOURCE_CONFLICT,
            description: `Direct permission (${directLevel}) conflicts with group permission (${groupLevel})`,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Resolve conflicts using priority and permission hierarchy
   */
  private resolveConflicts(permissions: UnifiedPermission[], conflicts: PermissionConflict[]): PermissionLevel {
    // Strategy: Use the highest priority permission,
    // and within same priority, use the highest permission level

    // Group by priority
    const permissionsByPriority = new Map<number, UnifiedPermission[]>();
    permissions.forEach((perm) => {
      if (!permissionsByPriority.has(perm.priority)) {
        permissionsByPriority.set(perm.priority, []);
      }
      permissionsByPriority.get(perm.priority)!.push(perm);
    });

    // Get the highest priority group
    const sortedPriorities = Array.from(permissionsByPriority.keys()).sort((a, b) => a - b);
    const highestPriorityPerms = permissionsByPriority.get(sortedPriorities[0])!;

    // Within highest priority, get the highest permission level
    return this.getHighestPermission(highestPriorityPerms);
  }

  /**
   * Get the highest permission level from a list of permissions
   */
  private getHighestPermission(permissions: UnifiedPermission[]): PermissionLevel {
    return permissions.reduce((highest, current) => {
      return this.getHigherPermissionLevel(highest, current.permission);
    }, PermissionLevel.NONE as PermissionLevel);
  }

  /**
   * Compare two permission levels and return the higher one
   */
  private getHigherPermissionLevel(a: PermissionLevel, b: PermissionLevel): PermissionLevel {
    return this.permissionHierarchy[a] > this.permissionHierarchy[b] ? a : b;
  }

  /**
   * Clean up conflicting permissions in the database
   * Keeps the resolved permission and removes others
   */
  private async cleanupConflictingPermissions(permissions: UnifiedPermission[], resolvedPermission: PermissionLevel): Promise<void> {
    try {
      // Find the best permission to keep (highest priority with resolved permission level)
      const permissionsToKeep = permissions.filter((p) => p.permission === resolvedPermission);

      if (permissionsToKeep.length === 0) {
        // This shouldn't happen, but if it does, keep the highest priority permission
        // and update its permission level
        const highestPriorityPerm = permissions.reduce((highest, current) => {
          return current.priority < highest.priority ? current : highest;
        });

        await this.prismaService.unifiedPermission.update({
          where: { id: highestPriorityPerm.id },
          data: { permission: resolvedPermission },
        });

        // Remove all other permissions
        const idsToRemove = permissions.filter((p) => p.id !== highestPriorityPerm.id).map((p) => p.id);

        if (idsToRemove.length > 0) {
          await this.prismaService.unifiedPermission.deleteMany({
            where: { id: { in: idsToRemove } },
          });
        }
      } else {
        // Keep the highest priority permission with the resolved level
        const permissionToKeep = permissionsToKeep.reduce((highest, current) => {
          return current.priority < highest.priority ? current : highest;
        });

        // Remove all other permissions
        const idsToRemove = permissions.filter((p) => p.id !== permissionToKeep.id).map((p) => p.id);

        if (idsToRemove.length > 0) {
          await this.prismaService.unifiedPermission.deleteMany({
            where: { id: { in: idsToRemove } },
          });
        }
      }
    } catch (error) {
      console.error(`Error cleaning up conflicting permissions:`, error);
      throw error;
    }
  }

  /**
   * Batch conflict detection and resolution for multiple resources
   */
  async batchDetectAndResolveConflicts(
    userId: string,
    resourceType: ResourceType,
    resourceIds: string[],
  ): Promise<
    Record<
      string,
      {
        hadConflicts: boolean;
        resolvedPermission: PermissionLevel;
        conflicts: PermissionConflict[];
      }
    >
  > {
    const results: Record<string, any> = {};

    // Process in chunks to avoid overwhelming the database
    const chunkSize = 50;
    for (let i = 0; i < resourceIds.length; i += chunkSize) {
      const chunk = resourceIds.slice(i, i + chunkSize);
      const chunkPromises = chunk.map(async (resourceId) => {
        const result = await this.detectAndResolveConflicts(userId, resourceType, resourceId);
        return { resourceId, result };
      });

      const chunkResults = await Promise.all(chunkPromises);
      chunkResults.forEach(({ resourceId, result }) => {
        results[resourceId] = result;
      });
    }

    return results;
  }

  /**
   * Validate permission consistency across inheritance chain
   */
  async validatePermissionConsistency(
    userId: string,
    documentId: string,
  ): Promise<{
    isConsistent: boolean;
    issues: string[];
    suggestedFixes: string[];
  }> {
    try {
      const issues: string[] = [];
      const suggestedFixes: string[] = [];

      // 1. Get document and its context
      const document = await this.prismaService.doc.findUnique({
        where: { id: documentId },
        include: {
          subspace: true,
          workspace: true,
          parent: true,
        },
      });

      if (!document) {
        return {
          isConsistent: false,
          issues: [`Document ${documentId} not found`],
          suggestedFixes: [],
        };
      }

      // 2. Get all permissions for this user and document
      const permissions = await this.prismaService.unifiedPermission.findMany({
        where: {
          userId,
          resourceType: ResourceType.DOCUMENT,
          resourceId: documentId,
        },
      });

      // 3. Check for duplicate source types
      const sourceTypes = permissions.map((p) => p.sourceType);
      const duplicateSources = sourceTypes.filter((source, index) => sourceTypes.indexOf(source) !== index);

      if (duplicateSources.length > 0) {
        issues.push(`Duplicate source types found: ${duplicateSources.join(", ")}`);
        suggestedFixes.push(`Remove duplicate permissions for sources: ${duplicateSources.join(", ")}`);
      }

      // 4. Check priority consistency
      const priorityMap: Record<SourceType, number> = {
        [SourceType.DIRECT]: 1,
        [SourceType.GROUP]: 2,
        [SourceType.SUBSPACE_ADMIN]: 3,
        [SourceType.SUBSPACE_MEMBER]: 4,
        [SourceType.WORKSPACE_ADMIN]: 5,
        [SourceType.WORKSPACE_MEMBER]: 6,
        [SourceType.GUEST]: 7,
      };

      for (const permission of permissions) {
        const expectedPriority = priorityMap[permission.sourceType];
        if (permission.priority !== expectedPriority) {
          issues.push(
            `Permission ${permission.id} has incorrect priority ${permission.priority}, expected ${expectedPriority} for source ${permission.sourceType}`,
          );
          suggestedFixes.push(`Update priority for permission ${permission.id} to ${expectedPriority}`);
        }
      }

      // 5. Check subspace membership consistency
      if (document.subspaceId) {
        const subspaceMembership = await this.prismaService.subspaceMember.findUnique({
          where: {
            subspaceId_userId: {
              subspaceId: document.subspaceId,
              userId,
            },
          },
        });

        const hasSubspacePermissions = permissions.some((p) => p.sourceType === SourceType.SUBSPACE_ADMIN || p.sourceType === SourceType.SUBSPACE_MEMBER);

        if (subspaceMembership && !hasSubspacePermissions) {
          issues.push(`User is subspace member but has no subspace-based permissions for document`);
          suggestedFixes.push(`Add subspace-based permission for document ${documentId}`);
        }

        if (!subspaceMembership && hasSubspacePermissions) {
          issues.push(`User has subspace-based permissions but is not a subspace member`);
          suggestedFixes.push(`Remove invalid subspace-based permissions or add user to subspace`);
        }
      }

      // 6. Check workspace membership consistency
      const workspaceMembership = await this.prismaService.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: document.workspaceId,
            userId,
          },
        },
      });

      const hasWorkspacePermissions = permissions.some((p) => p.sourceType === SourceType.WORKSPACE_ADMIN || p.sourceType === SourceType.WORKSPACE_MEMBER);

      if (workspaceMembership && !hasWorkspacePermissions) {
        issues.push(`User is workspace member but has no workspace-based permissions for document`);
        suggestedFixes.push(`Add workspace-based permission for document ${documentId}`);
      }

      if (!workspaceMembership && hasWorkspacePermissions) {
        issues.push(`User has workspace-based permissions but is not a workspace member`);
        suggestedFixes.push(`Remove invalid workspace-based permissions or add user to workspace`);
      }

      return {
        isConsistent: issues.length === 0,
        issues,
        suggestedFixes,
      };
    } catch (error) {
      console.error(`Error validating permission consistency:`, error);
      throw error;
    }
  }

  /**
   * Auto-fix common permission inconsistencies
   */
  async autoFixPermissionInconsistencies(
    userId: string,
    documentId: string,
  ): Promise<{
    fixesApplied: string[];
    remainingIssues: string[];
  }> {
    try {
      const fixesApplied: string[] = [];
      const remainingIssues: string[] = [];

      // 1. Detect and resolve conflicts
      const conflictResult = await this.detectAndResolveConflicts(userId, ResourceType.DOCUMENT, documentId);

      if (conflictResult.hadConflicts) {
        fixesApplied.push(`Resolved ${conflictResult.conflicts.length} permission conflicts`);
      }

      // 2. Validate consistency
      const consistencyResult = await this.validatePermissionConsistency(userId, documentId);

      // 3. Apply automatic fixes where possible
      const permissions = await this.prismaService.unifiedPermission.findMany({
        where: {
          userId,
          resourceType: ResourceType.DOCUMENT,
          resourceId: documentId,
        },
      });

      // Fix priority inconsistencies
      const priorityMap: Record<SourceType, number> = {
        [SourceType.DIRECT]: 1,
        [SourceType.GROUP]: 2,
        [SourceType.SUBSPACE_ADMIN]: 3,
        [SourceType.SUBSPACE_MEMBER]: 4,
        [SourceType.WORKSPACE_ADMIN]: 5,
        [SourceType.WORKSPACE_MEMBER]: 6,
        [SourceType.GUEST]: 7,
      };

      for (const permission of permissions) {
        const expectedPriority = priorityMap[permission.sourceType];
        if (permission.priority !== expectedPriority) {
          await this.prismaService.unifiedPermission.update({
            where: { id: permission.id },
            data: { priority: expectedPriority },
          });
          fixesApplied.push(`Fixed priority for permission ${permission.id}`);
        }
      }

      // Add remaining issues that couldn't be auto-fixed
      remainingIssues.push(...consistencyResult.issues.filter((issue) => !issue.includes("incorrect priority")));

      return {
        fixesApplied,
        remainingIssues,
      };
    } catch (error) {
      console.error(`Error auto-fixing permission inconsistencies:`, error);
      throw error;
    }
  }
}
