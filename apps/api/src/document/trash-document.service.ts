import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";

@Injectable()
export class DocumentTrashService {
  constructor(private readonly prismaService: PrismaService) {}
  private static isCleanupRunning = false;

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
    // Verify document exists and belongs to user
    const doc = await this.prismaService.doc.findFirst({
      where: {
        id,
        authorId: userId,
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
        authorId: userId,
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

  async getTrash(userId: string) {
    return await this.prismaService.doc.findMany({
      where: {
        authorId: userId,
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
        deletedBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });
  }

  async restore(id: string, userId: string) {
    // Verify document exists and belongs to user
    const doc = await this.prismaService.doc.findFirst({
      where: {
        id,
        authorId: userId,
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
        authorId: userId,
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
