import { PermissionLevel } from "@idea/contracts";

import { Injectable } from "@nestjs/common";
import { User } from "@idea/contracts";
import { DefineAbility } from "@/_shared/casl/ability.decorator";
import { Action, AppAbility, BaseAbility } from "@/_shared/casl/ability.class";
import { DocPermissionResolveService } from "@/permission/document-permission.service";
import { ModelName } from "@casl/prisma/dist/types/prismaClientBoundTypes";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";

type DocumentAbilityContext = {
  doc?: {
    id: string;
    workspaceId: string;
    subspaceId?: string | null;
    authorId: string;
    parentId?: string | null;
    publishedAt?: Date | null;
  };
};

@Injectable()
@DefineAbility("Doc" as ModelName)
export class DocumentAbility extends BaseAbility {
  constructor(
    private readonly docPermissionResolveService: DocPermissionResolveService,
    private readonly prismaService: PrismaService,
  ) {
    super();
  }
  // Will be called on each request that triggers a policy check
  async createForUser(user: User, context?: Record<string, unknown>): Promise<AppAbility> {
    return this.createAbilityAsync(async (builder) => {
      const { can } = builder;
      const contextDoc = (context as DocumentAbilityContext | undefined)?.doc;

      if (contextDoc) {
        await this.buildContextSpecificPermissions(can, user, contextDoc);
      } else {
        await this.buildGlobalPermissions(can, user);
      }
    });
  }

  private async buildContextSpecificPermissions(can: any, user: User, contextDoc: DocumentAbilityContext["doc"]) {
    if (!contextDoc) return;

    const permissionResult = await this.docPermissionResolveService.resolveUserPermissionForDocument(user.id, {
      id: contextDoc.id,
      workspaceId: contextDoc.workspaceId,
      parentId: contextDoc.parentId ?? null,
      subspaceId: contextDoc.subspaceId ?? null,
    });

    let level = permissionResult.level;

    // Author always has MANAGE level permissions on their own documents
    if (contextDoc.authorId === user.id && level !== PermissionLevel.MANAGE) {
      level = PermissionLevel.MANAGE;
    }

    this.defineContentPermissionsByLevel(can, contextDoc.id, level);

    // Handle Share permission separately with draft/subspace logic
    await this.defineSharePermission(can, user, contextDoc, level);

    // Additional Delete/Restore/PermanentDelete permissions for admins
    await this.defineAdminDeletionPermissions(can, user, contextDoc);
  }

  private async buildGlobalPermissions(can: any, user: User) {
    // Get user's workspace role to determine global permissions
    const workspaceMembers = await this.prismaService.workspaceMember.findMany({
      where: { userId: user.id },
      select: {
        workspaceId: true,
        role: true,
      },
    });

    const workspaceAdminIds = workspaceMembers.filter((m) => m.role === "ADMIN" || m.role === "OWNER").map((m) => m.workspaceId);

    // Get subspaces where user is admin
    const subspaceAdminMemberships = await this.prismaService.subspaceMember.findMany({
      where: {
        userId: user.id,
        role: "ADMIN",
      },
      select: {
        subspaceId: true,
      },
    });

    const adminSubspaceIds = subspaceAdminMemberships.map((m) => m.subspaceId);

    // Author always has full permissions on their own docs
    can([Action.Read, Action.Update, Action.Delete, Action.Share], "Doc", { authorId: user.id });
    can([Action.Archive, Action.Restore, Action.Publish, Action.Unpublish], "Doc", { authorId: user.id });
    can([Action.PermanentDelete, Action.Duplicate], "Doc", { authorId: user.id });

    // Workspace admins can delete, restore, and permanently delete ANY doc in their workspace
    if (workspaceAdminIds.length > 0) {
      can([Action.Delete, Action.Restore, Action.PermanentDelete], "Doc", { workspaceId: { $in: workspaceAdminIds } });
    }

    // Subspace admins can delete, restore, and permanently delete ANY doc in their subspace
    if (adminSubspaceIds.length > 0) {
      can([Action.Delete, Action.Restore, Action.PermanentDelete], "Doc", { subspaceId: { $in: adminSubspaceIds } });
    }
  }

  private defineContentPermissionsByLevel(can: any, docId: string, level: PermissionLevel) {
    switch (level) {
      case PermissionLevel.MANAGE:
        can([Action.Read, Action.Comment, Action.Update, Action.Delete, Action.Manage], "Doc", { id: docId });
        // MANAGE level can archive, restore, publish, and unpublish documents
        can([Action.Archive, Action.Restore, Action.Publish, Action.Unpublish], "Doc", { id: docId });
        // MANAGE level can permanently delete documents (destructive action)
        can(Action.PermanentDelete, "Doc", { id: docId });
        // All levels READ and above can duplicate documents
        can(Action.Duplicate, "Doc", { id: docId });
        break;
      case PermissionLevel.EDIT:
        can([Action.Read, Action.Comment, Action.Update], "Doc", { id: docId });
        // EDIT level can publish documents (for publishing drafts)
        can(Action.Publish, "Doc", { id: docId });
        // EDIT level can duplicate documents
        can(Action.Duplicate, "Doc", { id: docId });
        break;
      case PermissionLevel.COMMENT:
        can([Action.Read, Action.Comment], "Doc", { id: docId });
        break;
      case PermissionLevel.READ:
        can(Action.Read, "Doc", { id: docId });

        break;
    }
  }

  /**
   * Define additional Delete/Restore/PermanentDelete permissions for workspace and subspace admins
   *
   * Rules:
   * 1. Workspace admin/owner can delete/restore/permanently delete ANY doc in their workspace
   * 2. Subspace admin can delete/restore/permanently delete ANY doc in their subspace
   * 3. In PERSONAL workspace, the owner can delete ANY doc in that workspace
   */
  private async defineAdminDeletionPermissions(can: any, user: User, contextDoc: DocumentAbilityContext["doc"]) {
    if (!contextDoc) return;

    // Check if user is workspace admin/owner
    const workspaceMember = await this.prismaService.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: contextDoc.workspaceId,
          userId: user.id,
        },
      },
      select: {
        role: true,
        workspace: {
          select: {
            type: true,
          },
        },
      },
    });

    const isWorkspaceAdmin = workspaceMember?.role === "ADMIN" || workspaceMember?.role === "OWNER";

    // In PERSONAL workspace, OWNER has full delete permissions on all docs
    // In TEAM workspace, ADMIN/OWNER has full delete permissions on all docs
    if (isWorkspaceAdmin) {
      can([Action.Delete, Action.Restore, Action.PermanentDelete], "Doc", { id: contextDoc.id });
      return;
    }

    // Check if user is subspace admin (if doc has subspace)
    if (contextDoc.subspaceId) {
      const subspaceMember = await this.prismaService.subspaceMember.findFirst({
        where: {
          subspaceId: contextDoc.subspaceId,
          userId: user.id,
        },
        select: { role: true },
      });

      const isSubspaceAdmin = subspaceMember?.role === "ADMIN";

      if (isSubspaceAdmin) {
        can([Action.Delete, Action.Restore, Action.PermanentDelete], "Doc", { id: contextDoc.id });
      }
    }
  }

  /**
   * Define Share permission with special logic for draft/published state and subspace type
   *
   * Rules:
   * 1. Personal subspace):
   *    - Only the author can share

   * 2. Other subspaces:
   *    - Subspace admins can share (if memberInvitePermission allows)
   *    - Document author can share
   *    - Users with MANAGE permission can share
   */
  private async defineSharePermission(can: any, user: User, contextDoc: DocumentAbilityContext["doc"], level: PermissionLevel) {
    if (!contextDoc || !contextDoc.subspaceId) return;

    const isAuthor = contextDoc.authorId === user.id;
    let shouldShare = false;

    const subspace = await this.prismaService.subspace.findUnique({
      where: { id: contextDoc.subspaceId },
      select: {
        type: true,
        memberInvitePermission: true,
      },
    });

    if (subspace?.type === "PERSONAL") {
      // Only author can share documents in personal subspace
      if (isAuthor) {
        shouldShare = true;
      }
      return;
    }

    const subspaceMember = await this.prismaService.subspaceMember.findFirst({
      where: {
        subspaceId: contextDoc.subspaceId,
        userId: user.id,
      },
      select: { role: true },
    });

    const isSubspaceAdmin = subspaceMember?.role === "ADMIN";

    if (isAuthor || level === PermissionLevel.MANAGE || (isSubspaceAdmin && subspace?.memberInvitePermission === "ALL_MEMBERS")) {
      shouldShare = true;
    }
    // Document not in a subspace - only author or MANAGE permission can share
    if (isAuthor || level === PermissionLevel.MANAGE) {
      shouldShare = true;
    }

    if (shouldShare) {
      can(Action.Share, "Doc", { id: contextDoc.id });
    }
  }
}
