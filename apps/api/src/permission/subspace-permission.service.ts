import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { PermissionLevel, ResourceType, SourceType, SubspaceRole, SubspaceType, WorkspaceRole } from "@idea/contracts";
import type { UnifiedPermission } from "@idea/contracts";

interface SubspacePermissionChanges {
  subspaceAdminPermission?: PermissionLevel;
  subspaceMemberPermission?: PermissionLevel;
  nonSubspaceMemberPermission?: PermissionLevel;
  type?: SubspaceType;
}

interface SubspaceContext {
  id: string;
  type: SubspaceType;
  workspaceId: string;
  subspaceAdminPermission: PermissionLevel;
  subspaceMemberPermission: PermissionLevel;
  nonSubspaceMemberPermission: PermissionLevel;
}

interface DocumentContext {
  id: string;
  subspaceId: string;
  workspaceId: string;
  authorId: string;
}

@Injectable()
export class SubspacePermissionService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Apply subspace-level permission settings to document resolution
   * This considers the subspace type and role-based permission settings
   */
  async applySubspacePermissionsToDocument(userId: string, doc: DocumentContext): Promise<PermissionLevel> {
    // Get subspace context
    const subspace = await this.getSubspaceContext(doc.subspaceId);
    if (!subspace) {
      return PermissionLevel.NONE;
    }

    // Get user's role in subspace and workspace
    const [subspaceMember, workspaceMember] = await Promise.all([
      this.prismaService.subspaceMember.findUnique({
        where: { subspaceId_userId: { subspaceId: doc.subspaceId, userId } },
      }),
      this.prismaService.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: doc.workspaceId, userId } },
      }),
    ]);

    // Check if user is subspace member
    if (subspaceMember) {
      return this.getSubspaceMemberPermission(subspaceMember.role, subspace);
    }

    // Check if user is workspace member but not subspace member
    if (workspaceMember) {
      return this.getNonSubspaceMemberPermission(subspace);
    }

    // User is not a workspace member
    return PermissionLevel.NONE;
  }

  /**
   * Get effective subspace permission for user considering all factors
   */
  async getEffectiveSubspacePermissionForUser(userId: string, subspaceId: string): Promise<PermissionLevel> {
    // Get direct subspace permissions first (highest priority)
    const directPermissions = await this.prismaService.unifiedPermission.findMany({
      where: {
        userId,
        resourceType: ResourceType.SUBSPACE,
        resourceId: subspaceId,
        sourceType: { in: [SourceType.DIRECT, SourceType.GROUP] },
      },
      orderBy: { priority: "asc" },
    });

    if (directPermissions.length > 0) {
      return directPermissions[0].permission;
    }

    // Get subspace context and user roles
    const [subspace, subspaceMember, workspaceMember] = await Promise.all([
      this.getSubspaceContext(subspaceId),
      this.prismaService.subspaceMember.findUnique({
        where: { subspaceId_userId: { subspaceId, userId } },
      }),
      this.prismaService.subspace.findUnique({ where: { id: subspaceId } }).then((s) =>
        s
          ? this.prismaService.workspaceMember.findUnique({
              where: { workspaceId_userId: { workspaceId: s.workspaceId, userId } },
            })
          : null,
      ),
    ]);

    if (!subspace) {
      return PermissionLevel.NONE;
    }

    // Apply role-based permissions
    if (subspaceMember) {
      return this.getSubspaceMemberPermission(subspaceMember.role, subspace);
    }

    if (workspaceMember) {
      return this.getNonSubspaceMemberPermission(subspace);
    }

    return PermissionLevel.NONE;
  }

  /**
   * Propagate subspace permission changes to all documents in the subspace
   * This is called when subspace admin changes permission settings
   */
  async propagateSubspacePermissionChanges(subspaceId: string, changes: SubspacePermissionChanges): Promise<void> {
    const subspace = await this.getSubspaceContext(subspaceId);
    if (!subspace) {
      throw new Error(`Subspace ${subspaceId} not found`);
    }

    // Get all documents in the subspace
    const documents = await this.prismaService.doc.findMany({
      where: { subspaceId },
      select: { id: true, authorId: true },
    });

    // Get all users who have permissions related to this subspace
    const affectedUsers = await this.getAffectedUsersBySubspaceChange(subspaceId);

    // If subspace type changed, handle type-specific permission changes
    if (changes.type && changes.type !== subspace.type) {
      await this.handleSubspaceTypeChange(subspaceId, subspace.type, changes.type);
    }

    // Update subspace permission settings in database
    const updateData: any = {};
    if (changes.subspaceAdminPermission !== undefined) {
      updateData.subspaceAdminPermission = changes.subspaceAdminPermission;
    }
    if (changes.subspaceMemberPermission !== undefined) {
      updateData.subspaceMemberPermission = changes.subspaceMemberPermission;
    }
    if (changes.nonSubspaceMemberPermission !== undefined) {
      updateData.nonSubspaceMemberPermission = changes.nonSubspaceMemberPermission;
    }
    if (changes.type !== undefined) {
      updateData.type = changes.type;
    }

    if (Object.keys(updateData).length > 0) {
      await this.prismaService.subspace.update({
        where: { id: subspaceId },
        data: updateData,
      });
    }

    // Invalidate permission cache for affected users and documents
    // This would typically trigger a cache invalidation event
    console.log(`Permission changes propagated for subspace ${subspaceId}`, {
      affectedUsers: affectedUsers.length,
      affectedDocuments: documents.length,
      changes,
    });
  }

  /**
   * Handle subspace type changes and their permission implications
   */
  async handleSubspaceTypeChange(subspaceId: string, oldType: SubspaceType, newType: SubspaceType): Promise<void> {
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id: subspaceId },
      include: { workspace: true },
    });

    if (!subspace) {
      throw new Error(`Subspace ${subspaceId} not found`);
    }

    // Handle specific type transitions
    switch (newType) {
      case SubspaceType.WORKSPACE_WIDE:
        await this.handleTransitionToWorkspaceWide(subspaceId, subspace.workspaceId);
        break;
      case SubspaceType.PUBLIC:
        await this.handleTransitionToPublic(subspaceId, subspace.workspaceId, oldType);
        break;
      case SubspaceType.INVITE_ONLY:
        await this.handleTransitionToInviteOnly(subspaceId, oldType);
        break;
      case SubspaceType.PRIVATE:
        await this.handleTransitionToPrivate(subspaceId, oldType);
        break;
      case SubspaceType.PERSONAL:
        await this.handleTransitionToPersonal(subspaceId, oldType);
        break;
    }
  }

  /**
   * Get users who would be affected by subspace permission changes
   */
  private async getAffectedUsersBySubspaceChange(subspaceId: string): Promise<string[]> {
    const [subspaceMembers, workspaceMembers, directPermissions] = await Promise.all([
      // Users who are subspace members
      this.prismaService.subspaceMember.findMany({
        where: { subspaceId },
        select: { userId: true },
      }),
      // Users who are workspace members (for non-subspace member permissions)
      this.prismaService.subspace
        .findUnique({ where: { id: subspaceId } })
        .then((s) =>
          s
            ? this.prismaService.workspaceMember.findMany({
                where: { workspaceId: s.workspaceId },
                select: { userId: true },
              })
            : [],
        ),
      // Users who have direct permissions on this subspace
      this.prismaService.unifiedPermission.findMany({
        where: {
          resourceType: ResourceType.SUBSPACE,
          resourceId: subspaceId,
          sourceType: { in: [SourceType.DIRECT, SourceType.GROUP] },
        },
        select: { userId: true },
      }),
    ]);

    const userIds = new Set<string>();

    subspaceMembers.forEach((member) => userIds.add(member.userId));
    workspaceMembers.forEach((member) => userIds.add(member.userId));
    directPermissions.forEach((perm) => {
      if (perm.userId) userIds.add(perm.userId);
    });

    return Array.from(userIds);
  }

  /**
   * Handle transition to WORKSPACE_WIDE subspace type
   */
  private async handleTransitionToWorkspaceWide(subspaceId: string, workspaceId: string): Promise<void> {
    // Get all workspace members
    const workspaceMembers = await this.prismaService.workspaceMember.findMany({
      where: { workspaceId },
    });

    // Add all workspace members as subspace members if they're not already
    for (const member of workspaceMembers) {
      await this.prismaService.subspaceMember.upsert({
        where: { subspaceId_userId: { subspaceId, userId: member.userId } },
        create: {
          subspaceId,
          userId: member.userId,
          role: member.role === WorkspaceRole.OWNER || member.role === WorkspaceRole.ADMIN ? SubspaceRole.ADMIN : SubspaceRole.MEMBER,
        },
        update: {}, // Don't change existing roles
      });
    }
  }

  /**
   * Handle transition to PUBLIC subspace type
   */
  private async handleTransitionToPublic(subspaceId: string, workspaceId: string, oldType: SubspaceType): Promise<void> {
    // If transitioning from WORKSPACE_WIDE, don't remove existing members
    // Just update the type-based permissions
    if (oldType === SubspaceType.WORKSPACE_WIDE) {
      // Keep existing members but they can now leave if they want
      console.log(`Transitioned subspace ${subspaceId} from WORKSPACE_WIDE to PUBLIC`);
    }
  }

  /**
   * Handle transition to INVITE_ONLY subspace type
   */
  private async handleTransitionToInviteOnly(subspaceId: string, oldType: SubspaceType): Promise<void> {
    // If transitioning from PUBLIC or WORKSPACE_WIDE, keep existing members
    // New members will need explicit invitations
    console.log(`Transitioned subspace ${subspaceId} to INVITE_ONLY from ${oldType}`);
  }

  /**
   * Handle transition to PRIVATE subspace type
   */
  private async handleTransitionToPrivate(subspaceId: string, oldType: SubspaceType): Promise<void> {
    // If transitioning from other types, keep existing members
    // But remove any non-subspace member permissions
    console.log(`Transitioned subspace ${subspaceId} to PRIVATE from ${oldType}`);
  }

  /**
   * Handle transition to PERSONAL subspace type
   */
  private async handleTransitionToPersonal(subspaceId: string, oldType: SubspaceType): Promise<void> {
    // Get the subspace creator/owner
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id: subspaceId },
    });

    if (!subspace) return;

    // Remove all members except the creator
    const creator = await this.prismaService.subspaceMember.findFirst({
      where: { subspaceId, role: SubspaceRole.ADMIN },
    });

    if (creator) {
      await this.prismaService.subspaceMember.deleteMany({
        where: {
          subspaceId,
          userId: { not: creator.userId },
        },
      });
    }
  }

  /**
   * Get permission level for subspace members based on their role
   */
  private getSubspaceMemberPermission(role: SubspaceRole, subspace: SubspaceContext): PermissionLevel {
    return role === SubspaceRole.ADMIN ? subspace.subspaceAdminPermission : subspace.subspaceMemberPermission;
  }

  /**
   * Get permission level for non-subspace members based on subspace type
   */
  private getNonSubspaceMemberPermission(subspace: SubspaceContext): PermissionLevel {
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

  /**
   * Get subspace context with all permission settings
   */
  private async getSubspaceContext(subspaceId: string): Promise<SubspaceContext | null> {
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id: subspaceId },
      select: {
        id: true,
        type: true,
        workspaceId: true,
        subspaceAdminPermission: true,
        subspaceMemberPermission: true,
        nonSubspaceMemberPermission: true,
      },
    });

    return subspace;
  }

  /**
   * Batch apply subspace permissions to multiple documents
   */
  async batchApplySubspacePermissionsToDocuments(userId: string, documents: DocumentContext[]): Promise<Record<string, PermissionLevel>> {
    const result: Record<string, PermissionLevel> = {};

    // Group documents by subspace for efficient processing
    const docsBySubspace = new Map<string, DocumentContext[]>();

    for (const doc of documents) {
      if (!docsBySubspace.has(doc.subspaceId)) {
        docsBySubspace.set(doc.subspaceId, []);
      }
      docsBySubspace.get(doc.subspaceId)!.push(doc);
    }

    // Get all required data in batch
    const subspaceIds = Array.from(docsBySubspace.keys());
    const workspaceIds = [...new Set(documents.map((doc) => doc.workspaceId))];

    const [subspaces, subspaceMembers, workspaceMembers] = await Promise.all([
      this.prismaService.subspace.findMany({
        where: { id: { in: subspaceIds } },
        select: {
          id: true,
          type: true,
          workspaceId: true,
          subspaceAdminPermission: true,
          subspaceMemberPermission: true,
          nonSubspaceMemberPermission: true,
        },
      }),
      this.prismaService.subspaceMember.findMany({
        where: { userId, subspaceId: { in: subspaceIds } },
      }),
      this.prismaService.workspaceMember.findMany({
        where: { userId, workspaceId: { in: workspaceIds } },
      }),
    ]);

    // Create lookup maps for efficient access
    const subspaceMap = new Map(subspaces.map((s) => [s.id, s]));
    const subspaceMemberMap = new Map(subspaceMembers.map((m) => [m.subspaceId, m]));
    const workspaceMemberMap = new Map(workspaceMembers.map((m) => [m.workspaceId, m]));

    // Process each document
    for (const doc of documents) {
      const subspace = subspaceMap.get(doc.subspaceId);
      if (!subspace) {
        result[doc.id] = PermissionLevel.NONE;
        continue;
      }

      const subspaceMember = subspaceMemberMap.get(doc.subspaceId);
      const workspaceMember = workspaceMemberMap.get(doc.workspaceId);

      if (subspaceMember) {
        result[doc.id] = this.getSubspaceMemberPermission(subspaceMember.role, subspace);
      } else if (workspaceMember) {
        result[doc.id] = this.getNonSubspaceMemberPermission(subspace);
      } else {
        result[doc.id] = PermissionLevel.NONE;
      }
    }

    return result;
  }
}
