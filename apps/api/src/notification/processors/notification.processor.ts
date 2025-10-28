import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { NotificationService } from "../notification.service";
import { SubscriptionService } from "@/subscription/subscription.service";
import { DocumentViewService } from "@/document/document-view.service";
import { DocumentPublishedJobData, NotificationEventType, SPECIAL_WORKSPACE_ID } from "@idea/contracts";
import { isChangeOverThreshold } from "@/_shared/utils/document-diff.util";

/**
 * Notification background processor
 * Handles async notification creation for published documents
 */
@Processor("notifications")
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);
  private readonly deduplicationWindowSeconds: number;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly subscriptionService: SubscriptionService,
    private readonly documentViewService: DocumentViewService,
    private readonly configService: ConfigService,
  ) {
    super();
    // Get configurable deduplication window (default: 6 hours = 21600 seconds)
    this.deduplicationWindowSeconds = this.configService.get<number>("NOTIFICATION_DEDUPLICATION_WINDOW_SECONDS", 21600);
    this.logger.log(`[NOTIFICATION-PROCESSOR] Initialized with deduplication window: ${this.deduplicationWindowSeconds} seconds`);
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`[NOTIFICATION-PROCESSOR] Processing job: ${job.name} with ID: ${job.id}, data:`, JSON.stringify(job.data));

    try {
      switch (job.name) {
        case "document-published":
          this.logger.log(`[NOTIFICATION-PROCESSOR] Handling document-published for documentId: ${job.data.documentId}`);
          await this.handleDocumentPublished(job.data as DocumentPublishedJobData);
          this.logger.log(`[NOTIFICATION-PROCESSOR] Successfully completed document-published for documentId: ${job.data.documentId}`);
          break;
        default:
          this.logger.warn(`Unknown job name: ${job.name}`);
      }
    } catch (error) {
      const err = error as any;
      this.logger.error(
        `[NOTIFICATION-PROCESSOR] ❌ FATAL ERROR processing job ${job.name} (ID: ${job.id})`,
        JSON.stringify(
          {
            jobId: job.id,
            jobName: job.name,
            jobData: job.data,
            errorMessage: err?.message || String(error),
            errorName: err?.name,
            errorCode: err?.code,
            errorStack: err?.stack,
          },
          null,
          2,
        ),
      );
      throw error; // Let BullMQ handle retry
    }
  }

  private async handleDocumentPublished(data: DocumentPublishedJobData) {
    const { documentId, publisherId, workspaceId, isFirstPublish } = data;

    this.logger.log(`[DEBUG] Processing document publish - documentId: ${documentId}, publisherId: ${publisherId}, isFirstPublish: ${isFirstPublish}`);

    // 1. On first publish, auto-subscribe all collaborators
    if (isFirstPublish) {
      this.logger.log(`[DEBUG] First publish detected - auto-subscribing collaborators`);
      await this.subscriptionService.autoSubscribeAllCollaborators(documentId);
      this.logger.log(`[DEBUG] Collaborators auto-subscribed, but not notifying them for first publish`);
      return; // Don't notify on first publish
    }

    // 2. Check change threshold - only notify if changes are significant
    const isSignificantChange = await this.checkChangeThreshold(documentId);
    if (!isSignificantChange) {
      this.logger.log(`[DEBUG] Suppressing notifications - changes below threshold for document ${documentId}`);
      return;
    }

    // 3. Get all subscribers
    const subscriberUserIds = await this.subscriptionService.getSubscribersForDocument(documentId);
    this.logger.log(`[DEBUG] Found ${subscriberUserIds.length} subscribers for document ${documentId}`);

    if (subscriberUserIds.length === 0) {
      this.logger.log(`[DEBUG] No subscribers found, skipping notification creation`);
      return;
    }

    // 4. Get document info for notification metadata
    const document = await this.prismaService.doc.findUnique({
      where: { id: documentId },
      select: {
        title: true,
        updatedAt: true,
        lastPublishedBy: {
          select: {
            displayName: true,
            email: true,
          },
        },
      },
    });

    if (!document) {
      this.logger.error(`[ERROR] Document ${documentId} not found`);
      return;
    }

    const actorName = document.lastPublishedBy?.displayName || document.lastPublishedBy?.email || "Unknown";

    // 5. Filter and notify each subscriber
    // Note: since we are using deduplication window, we need to check if the user should be notified before creating the notification instead of batching them all at once.
    let notifiedCount = 0;
    for (const subscriberId of subscriberUserIds) {
      // Skip notifying the publisher
      if (subscriberId === publisherId) {
        this.logger.log(`[DEBUG] Skipping notification for publisher ${publisherId}`);
        continue;
      }

      // Check deduplication window
      const shouldNotify = await this.checkUserViewTimeWindowSpan(subscriberId, documentId);
      if (!shouldNotify) {
        this.logger.log(`[DEBUG] Skipping notification for user ${subscriberId} due to deduplication window`);
        continue;
      }

      // Check if user has already viewed the document since last update
      const hasViewed = await this.documentViewService.hasViewedAfter(subscriberId, documentId, document.updatedAt);
      if (hasViewed) {
        this.logger.log(`[DEBUG] Skipping notification for user ${subscriberId} - already viewed update`);
        continue;
      }

      try {
        // Create notification with SPECIAL_WORKSPACE_ID for cross-workspace visibility
        // Subscription notifications should be visible regardless of which workspace the user is viewing
        // This allows users to see updates from subscribed documents even when in a different workspace
        await this.notificationService.createNotification({
          userId: subscriberId,
          event: NotificationEventType.DOCUMENT_UPDATE,
          workspaceId: SPECIAL_WORKSPACE_ID, // Cross-workspace visibility
          documentId,
          actorId: publisherId,
          metadata: {
            documentTitle: document.title,
            actorName,
            sourceWorkspaceId: workspaceId, // Store original workspace ID in metadata for reference
          },
        });
        notifiedCount++;
        this.logger.log(`[DEBUG] Created cross-workspace DOCUMENT_UPDATE notification for subscriber ${subscriberId}`);
      } catch (error) {
        const err = error as any;
        this.logger.error(
          `[ERROR] Failed to create notification for subscriber ${subscriberId}`,
          JSON.stringify({
            documentId,
            subscriberId,
            error: err?.message || String(error),
            errorCode: err?.code,
            errorStack: err?.stack,
          }),
        );
        // Don't throw - continue with other subscribers
      }
    }

    this.logger.log(`[NOTIFICATION-PROCESSOR] Notified ${notifiedCount} out of ${subscriberUserIds.length} subscribers for document ${documentId}`);
  }

  /**
   * Check if a user should be notified based on deduplication window
   * Returns true if enough time has passed since their last notification for this document
   */
  private async checkUserViewTimeWindowSpan(userId: string, documentId: string): Promise<boolean> {
    // Find the most recent DOCUMENT_UPDATE notification for this user and document
    const recentNotification = await this.prismaService.notification.findFirst({
      where: {
        userId,
        documentId,
        event: NotificationEventType.DOCUMENT_UPDATE,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        createdAt: true,
      },
    });

    if (!recentNotification) {
      // No previous notification, always notify
      return true;
    }

    // Calculate time since last notification
    const now = new Date();
    const timeSinceLastNotification = (now.getTime() - recentNotification.createdAt.getTime()) / 1000; // in seconds

    const shouldNotify = timeSinceLastNotification >= this.deduplicationWindowSeconds;

    this.logger.log(
      `[DEBUG] Deduplication check for user ${userId}: ` +
        `last notified ${Math.floor(timeSinceLastNotification)}s ago, ` +
        `window: ${this.deduplicationWindowSeconds}s, ` +
        `shouldNotify: ${shouldNotify}`,
    );

    return shouldNotify;
  }

  /**
   * Check if document changes exceed threshold
   * Compares current version with previous revision to determine if changes are significant
   *
   * @param documentId - Document ID to check
   * @returns true if changes exceed threshold (5 characters), false otherwise
   */
  private async checkChangeThreshold(documentId: string): Promise<boolean> {
    try {
      // Get current document and previous revision
      const [currentDoc, previousRevision] = await Promise.all([
        this.prismaService.doc.findUnique({
          where: { id: documentId },
          select: {
            content: true,
            contentBinary: true,
            title: true,
          },
        }),
        this.prismaService.docRevision.findFirst({
          where: { docId: documentId },
          orderBy: { createdAt: "desc" },
          select: {
            content: true,
            title: true,
          },
        }),
      ]);

      if (!currentDoc) {
        this.logger.warn(`[DEBUG] Document ${documentId} not found for change threshold check`);
        return true; // Assume significant change if document not found
      }

      if (!previousRevision) {
        this.logger.log(`[DEBUG] No previous revision found for document ${documentId}, assuming significant change`);
        return true; // First version, always notify
      }

      // Compare content - prefer JSON content over binary for text comparison
      const beforeContent = previousRevision.content ? JSON.parse(previousRevision.content) : null;
      const afterContent = currentDoc.content ? JSON.parse(currentDoc.content) : null;

      // Also compare titles
      const titleChanged = currentDoc.title !== previousRevision.title;
      const titleChanges = titleChanged ? Math.abs(currentDoc.title.length - previousRevision.title.length) : 0;

      // Check content changes
      const contentChangeExceedsThreshold = isChangeOverThreshold(beforeContent, afterContent, 5);

      // If title changed significantly OR content changed significantly, notify
      const isSignificant = titleChanges > 5 || contentChangeExceedsThreshold;

      this.logger.log(
        `[DEBUG] Change threshold check for document ${documentId}: ` +
          `titleChanged=${titleChanged}, titleChanges=${titleChanges}, ` +
          `contentChangeExceedsThreshold=${contentChangeExceedsThreshold}, ` +
          `isSignificant=${isSignificant}`,
      );

      return isSignificant;
    } catch (error) {
      const err = error as any;
      this.logger.error(
        `[ERROR] Failed to check change threshold for document ${documentId}`,
        JSON.stringify({
          error: err?.message || String(error),
          errorStack: err?.stack,
        }),
      );
      // On error, assume significant change to avoid suppressing notifications incorrectly
      return true;
    }
  }
}
