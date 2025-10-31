import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { WorkspaceRole } from "@idea/contracts";

@Injectable()
export class DocumentTrashService {
  constructor(private readonly prismaService: PrismaService) {}
  private static isCleanupRunning = false;

  /**
   * Soft delete a document (set deletedAt timestamp)
   * Permission check is done by @CheckPolicy decorator in controller
   */
  async deleteDocument(documentId: string, userId: string) {
    const doc = await this.prismaService.doc.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        deletedAt: true,
        subspaceId: true,
      },
    });

    if (!doc) {
      throw new ApiException(ErrorCodeEnum.DocumentNotFound);
    }

    if (doc.deletedAt) {
      throw new ApiException(ErrorCodeEnum.DocumentNotFound);
    }

    // Soft delete: set deletedAt and deletedById
    return await this.prismaService.doc.update({
      where: { id: documentId },
      data: {
        deletedAt: new Date(),
        deletedById: userId,
      },
    });
  }

  async emptyTrash(userId: string) {
    // Get all soft-deleted documents
    const deletedDocs = await this.prismaService.doc.findMany({
      where: {
        authorId: userId,
        deletedAt: { not: null },
      },
      include: {
        coverImage: true,
      },
    });

    // Permanently delete all soft-deleted documents
    for (const doc of deletedDocs) {
      await this.permanentDelete(doc.id, userId);
    }

    return { success: true };
  }

  async permanentDelete(id: string, userId: string) {
    // Verify document exists and is deleted
    // Don't check authorId - permission check is done by @CheckPolicy in controller
    const doc = await this.prismaService.doc.findFirst({
      where: {
        id,
        deletedAt: { not: null },
      },
      include: {
        coverImage: true,
      },
    });

    if (!doc) throw new ApiException(ErrorCodeEnum.DocumentNotFound);

    // Hard delete all children recursively
    await this.permanentDeleteChildren(id, userId);

    // Delete document's cover image if exists
    if (doc.coverImage) {
      await this.prismaService.coverImage.delete({
        where: { docId: id },
      });
    }

    // Clear parent references to avoid orphaned children
    await this.prismaService.doc.updateMany({
      where: { parentId: id },
      data: { parentId: null },
    });

    // Hard delete the document (actually remove from database)
    // Cascade deletes will handle:
    // - DocumentPermissions
    // - PublicShare
    // - DocRevisions
    // - Stars
    // - Comments
    // - Subscriptions
    // - DocumentViews
    return await this.prismaService.doc.delete({
      where: { id },
    });
  }

  private async permanentDeleteChildren(parentId: string, userId: string) {
    const children = await this.prismaService.doc.findMany({
      where: {
        parentId,
      },
      include: {
        coverImage: true,
      },
    });

    for (const child of children) {
      // Recursively delete grandchildren first
      await this.permanentDeleteChildren(child.id, userId);

      // Delete child's cover image if exists
      if (child.coverImage) {
        await this.prismaService.coverImage.delete({
          where: { docId: child.id },
        });
      }

      // Hard delete the child document
      await this.prismaService.doc.delete({
        where: { id: child.id },
      });
    }
  }

  /**
   * Get trash documents visible to the user based on their role
   *
   * Permission rules:
   * - Normal member: Can only see deleted docs they created (author)
   * - Subspace admin: Can see all deleted docs in their subspace(s)
   * - Workspace admin: Can see all deleted docs in the entire workspace
   */
  async getTrash(userId: string) {
    // Get user's current workspace
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { currentWorkspaceId: true },
    });

    if (!user?.currentWorkspaceId) {
      return [];
    }

    // Check user's workspace role
    const workspaceMember = await this.prismaService.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: user.currentWorkspaceId,
          userId,
        },
      },
      select: { role: true },
    });

    const isWorkspaceAdmin = workspaceMember?.role === WorkspaceRole.ADMIN || workspaceMember?.role === WorkspaceRole.OWNER;

    // If workspace admin, show all deleted docs in workspace
    if (isWorkspaceAdmin) {
      return await this.prismaService.doc.findMany({
        where: {
          workspaceId: user.currentWorkspaceId,
          deletedAt: { not: null },
        },
        orderBy: {
          deletedAt: "desc",
        },
        select: {
          id: true,
          title: true,
          deletedAt: true,
          updatedAt: true,
          icon: true,
          parentId: true,
          authorId: true,
          subspaceId: true,
          author: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
          deletedBy: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
          coverImage: {
            select: {
              url: true,
              scrollY: true,
            },
          },
        },
      });
    }

    // Get subspaces where user is admin
    const subspaceAdminMemberships = await this.prismaService.subspaceMember.findMany({
      where: {
        userId,
        role: "ADMIN",
      },
      select: {
        subspaceId: true,
      },
    });

    const adminSubspaceIds = subspaceAdminMemberships.map((m) => m.subspaceId);

    // Build filter conditions
    // Normal member: only their own deleted docs
    // Subspace admin: their own docs + all docs in subspaces they admin
    const whereConditions: any[] = [
      // User's own deleted documents
      {
        authorId: userId,
        workspaceId: user.currentWorkspaceId,
        deletedAt: { not: null },
      },
    ];

    // If user is admin of any subspace, add those subspace docs
    if (adminSubspaceIds.length > 0) {
      whereConditions.push({
        subspaceId: { in: adminSubspaceIds },
        workspaceId: user.currentWorkspaceId,
        deletedAt: { not: null },
      });
    }

    return await this.prismaService.doc.findMany({
      where: {
        OR: whereConditions,
      },
      orderBy: {
        deletedAt: "desc",
      },
      select: {
        id: true,
        title: true,
        deletedAt: true,
        updatedAt: true,
        icon: true,
        parentId: true,
        authorId: true,
        subspaceId: true,
        author: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        deletedBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        coverImage: {
          select: {
            url: true,
            scrollY: true,
          },
        },
      },
    });
  }

  async restore(id: string, userId: string) {
    // Verify document exists and is deleted
    // Don't check authorId - permission check is done by @CheckPolicy in controller
    const doc = await this.prismaService.doc.findFirst({
      where: {
        id,
        deletedAt: { not: null },
      },
      include: {
        parent: true, // Include parent document info
      },
    });

    if (!doc) throw new ApiException(ErrorCodeEnum.DocumentNotFound);

    // Check if parent is deleted (if parent is hard-deleted, it won't exist)
    const shouldMoveToRoot = !doc.parent || doc.parent?.deletedAt;

    // Restore document and all its children
    await this.restoreChildren(id, userId);

    return await this.prismaService.doc.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedById: null,
        // If parent is deleted or doesn't exist, move document to root (subspace or workspace level)
        parentId: shouldMoveToRoot ? null : doc.parentId,
        // If moving to root, append to end of root documents
        ...(shouldMoveToRoot && {
          index: "z",
        }),
      },
    });
  }

  private async restoreChildren(parentId: string, userId: string) {
    const children = await this.prismaService.doc.findMany({
      where: {
        parentId,
        deletedAt: { not: null },
      },
    });

    for (const child of children) {
      await this.restoreChildren(child.id, userId);
      await this.prismaService.doc.update({
        where: { id: child.id },
        data: {
          deletedAt: null,
          deletedById: null,
        },
      });
    }
  }

  @Cron("0 0 * * *") // every day at 00:00
  async cleanupExpiredDocuments() {
    if (DocumentTrashService.isCleanupRunning) {
      console.log("[Cleanup] Task already running, skipping...");
      return;
    }

    DocumentTrashService.isCleanupRunning = true;
    console.log("[Cleanup] Task started at:", new Date().toISOString());

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      await this.prismaService.$transaction(async (tx) => {
        const expiredDocs = await tx.doc.findMany({
          where: {
            deletedAt: { not: null, lt: thirtyDaysAgo },
          },
          include: {
            coverImage: true,
          },
          orderBy: {
            deletedAt: "asc",
          },
          take: 10, // Process in batches to avoid overwhelming the DB
        });

        console.log(`[Cleanup] Found ${expiredDocs.length} expired documents`);

        for (const doc of expiredDocs) {
          try {
            const existingDoc = await tx.doc.findUnique({
              where: { id: doc.id },
              include: { coverImage: true },
            });

            if (!existingDoc) {
              console.log(`[Cleanup] Document ${doc.id} no longer exists`);
              continue;
            }

            // Delete cover image if exists
            if (existingDoc.coverImage) {
              await tx.coverImage.delete({
                where: { docId: doc.id },
              });
            }

            // Clear parent references
            await tx.doc.updateMany({
              where: { parentId: doc.id },
              data: { parentId: null },
            });

            // Hard delete the document (cascade deletes handle relations)
            await tx.doc.delete({
              where: { id: doc.id },
            });

            console.log(`[Cleanup] Successfully deleted document ${doc.id}`);
            await new Promise((resolve) => setTimeout(resolve, 200));
          } catch (error) {
            console.error(`[Cleanup] Error processing document ${doc.id}:`, error);
          }
        }
      });
    } catch (error) {
      console.error("[Cleanup] Task error:", error);
    } finally {
      DocumentTrashService.isCleanupRunning = false;
      console.log("[Cleanup] Task completed at:", new Date().toISOString());
    }
  }
}
