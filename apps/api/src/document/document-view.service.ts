import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";

/**
 * Service for tracking document views
 * Used to prevent redundant notifications when users have already viewed updates
 */
@Injectable()
export class DocumentViewService {
  private readonly logger = new Logger(DocumentViewService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record or update a document view
   * Creates a new view record or updates the timestamp if one exists
   */
  async recordView(userId: string, documentId: string): Promise<void> {
    try {
      await this.prisma.documentView.upsert({
        where: {
          userId_documentId: {
            userId,
            documentId,
          },
        },
        create: {
          userId,
          documentId,
        },
        update: {
          updatedAt: new Date(),
        },
      });

      this.logger.debug(`Recorded view for user ${userId} on document ${documentId}`);
    } catch (error) {
      // Log error but don't throw - view tracking is non-critical
      this.logger.error(`Failed to record view for user ${userId} on document ${documentId}:`, error);
    }
  }

  /**
   * Check if a user has viewed a document after a specific timestamp
   * Used to determine if notification should be suppressed
   *
   * @param userId - User ID
   * @param documentId - Document ID
   * @param afterTimestamp - Check if view happened after this time
   * @returns true if user viewed the document after the given timestamp
   */
  async hasViewedAfter(userId: string, documentId: string, afterTimestamp: Date): Promise<boolean> {
    try {
      const view = await this.prisma.documentView.findUnique({
        where: {
          userId_documentId: {
            userId,
            documentId,
          },
        },
        select: {
          updatedAt: true,
        },
      });

      if (!view) {
        return false;
      }

      return view.updatedAt > afterTimestamp;
    } catch (error) {
      this.logger.error(`Failed to check view status for user ${userId} on document ${documentId}:`, error);
      // On error, assume not viewed to avoid suppressing notifications incorrectly
      return false;
    }
  }

  /**
   * Get the last view time for a user on a document
   * Returns null if no view record exists
   */
  async getLastViewTime(userId: string, documentId: string): Promise<Date | null> {
    try {
      const view = await this.prisma.documentView.findUnique({
        where: {
          userId_documentId: {
            userId,
            documentId,
          },
        },
        select: {
          updatedAt: true,
        },
      });

      return view?.updatedAt || null;
    } catch (error) {
      this.logger.error(`Failed to get last view time for user ${userId} on document ${documentId}:`, error);
      return null;
    }
  }

  /**
   * Delete view records for a document (when document is deleted)
   */
  async deleteViewsForDocument(documentId: string): Promise<void> {
    try {
      await this.prisma.documentView.deleteMany({
        where: { documentId },
      });

      this.logger.debug(`Deleted view records for document ${documentId}`);
    } catch (error) {
      this.logger.error(`Failed to delete view records for document ${documentId}:`, error);
    }
  }

  /**
   * Delete view records for a user (when user is deleted)
   */
  async deleteViewsForUser(userId: string): Promise<void> {
    try {
      await this.prisma.documentView.deleteMany({
        where: { userId },
      });

      this.logger.debug(`Deleted view records for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to delete view records for user ${userId}:`, error);
    }
  }
}
