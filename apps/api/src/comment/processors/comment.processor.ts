import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { NotificationService } from "@/notification/notification.service";
import { CommentCreatedJobData, CommentUpdatedJobData, CommentResolvedJobData, NotificationEventType } from "@idea/contracts";
import { DocPermissionResolveService } from "@/permission/document-permission.service";
import { parseMentions, getUniqueMentionedUserIds } from "@/editor/mention-parser";
import type { JSONContent } from "@tiptap/core";

/**
 * Comment background processor
 */
@Processor("comments")
export class CommentProcessor extends WorkerHost {
  private readonly logger = new Logger(CommentProcessor.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly docPermissionService: DocPermissionResolveService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`[COMMENT-PROCESSOR] Processing job: ${job.name} with ID: ${job.id}, data:`, JSON.stringify(job.data));

    try {
      switch (job.name) {
        case "comment-created":
          this.logger.log(`[COMMENT-PROCESSOR] Handling comment-created for commentId: ${job.data.commentId}`);
          await this.handleCommentCreated(job.data as CommentCreatedJobData);
          this.logger.log(`[COMMENT-PROCESSOR] Successfully completed comment-created for commentId: ${job.data.commentId}`);
          break;
        case "comment-updated":
          await this.handleCommentUpdated(job.data as CommentUpdatedJobData);
          this.logger.log(`[COMMENT-PROCESSOR] Successfully completed comment-updated for commentId: ${job.data.commentId}`);
          break;
        case "comment-resolved":
          await this.handleCommentResolved(job.data as CommentResolvedJobData);
          this.logger.log(`[COMMENT-PROCESSOR] Successfully completed comment-resolved for commentId: ${job.data.commentId}`);
          break;
        default:
          this.logger.warn(`Unknown job name: ${job.name}`);
      }
    } catch (error) {
      const err = error as any;
      this.logger.error(
        `[COMMENT-PROCESSOR] ❌ FATAL ERROR processing job ${job.name} (ID: ${job.id})`,
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

  /**
   * Handle comment created event
   * 1. Auto-subscribe commenter to document
   * 2. Notify mentioned users
   * 3. Notify document author
   */
  private async handleCommentCreated(data: CommentCreatedJobData) {
    const comment = await this.prismaService.comment.findUnique({
      where: { id: data.commentId },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            workspaceId: true,
            authorId: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    if (!comment) {
      this.logger.warn(`Comment not found: ${data.commentId}`);
      return;
    }

    const document = comment.document;
    const actorName = comment.createdBy.displayName || comment.createdBy.email;

    this.logger.log(`[DEBUG] Processing comment ${comment.id}, data:`, JSON.stringify(comment.data));

    // 1. TODO: Auto-subscribe commenter to document (when subscription system is implemented)
    // await this.subscriptionService.createOrUpdate({
    //   userId: data.userId,
    //   documentId: document.id,
    //   event: 'document',
    //   resubscribe: false,
    // });

    // 2. Notify mentioned users
    const mentions = parseMentions(comment.data as JSONContent);
    const mentionedUserIds = getUniqueMentionedUserIds(mentions);

    this.logger.log(`[DEBUG] Parsed mentions:`, mentions);
    this.logger.log(`[DEBUG] Mentioned user IDs:`, mentionedUserIds);

    for (const mentionedUserId of mentionedUserIds) {
      this.logger.log(`[DEBUG] Processing mention for user: ${mentionedUserId}`);

      try {
        // Skip if mentioning self
        if (mentionedUserId === data.userId) {
          this.logger.log(`[DEBUG] Skipping self-mention`);
          continue;
        }

        // Check if mentioned user exists
        const mentionedUser = await this.prismaService.user.findUnique({
          where: { id: mentionedUserId },
          select: { id: true, email: true },
        });

        if (!mentionedUser) {
          this.logger.error(
            `[ERROR] Mentioned user does not exist: ${mentionedUserId}`,
            JSON.stringify({
              commentId: comment.id,
              mentionedUserId,
              documentId: document.id,
              error: "User not found in database",
            }),
          );
          continue; // Skip this user but continue with others
        }

        // TODO: Re-enable permission check after verifying notification flow works
        // const hasAccess = await this.checkDocumentAccess(mentionedUserId, document.id, document.workspaceId);
        // if (!hasAccess) {
        //   this.logger.warn(`User ${mentionedUserId} does not have access to document ${document.id}, skipping mention notification`);
        //   continue;
        // }

        // Create notification (permission check temporarily disabled for testing)
        this.logger.log(`[DEBUG] Creating COMMENT_MENTION notification for user: ${mentionedUserId} (${mentionedUser.email})`);
        await this.notificationService.createNotification({
          userId: mentionedUserId,
          event: NotificationEventType.COMMENT_MENTION,
          workspaceId: document.workspaceId,
          documentId: document.id,
          actorId: data.userId,
          metadata: {
            commentId: comment.id,
            documentTitle: document.title,
            isReply: !!comment.parentCommentId,
            actorName,
          },
        });
        this.logger.log(`[DEBUG] COMMENT_MENTION notification created successfully for ${mentionedUser.email}`);
      } catch (error) {
        // Log error but continue processing other mentions
        const err = error as any;
        this.logger.error(
          `[ERROR] Failed to create mention notification for user ${mentionedUserId}`,
          JSON.stringify({
            commentId: comment.id,
            mentionedUserId,
            documentId: document.id,
            error: err?.message || String(error),
            errorCode: err?.code,
            errorStack: err?.stack,
          }),
        );
        // Don't throw - continue with other mentions
      }
    }

    // 3. Notify document author (if not the commenter and not mentioned)
    if (document.authorId !== data.userId && !mentionedUserIds.includes(document.authorId)) {
      await this.notificationService.createNotification({
        userId: document.authorId,
        event: NotificationEventType.COMMENT_CREATED,
        workspaceId: document.workspaceId,
        documentId: document.id,
        actorId: data.userId,
        metadata: {
          commentId: comment.id,
          documentTitle: document.title,
          isReply: !!comment.parentCommentId,
          actorName,
        },
      });
    }

    this.logger.log(`Processed comment-created notifications for comment: ${comment.id}`);
  }

  /**
   * Handle comment updated event
   * Notify newly mentioned users only
   */
  private async handleCommentUpdated(data: CommentUpdatedJobData) {
    this.logger.log(`[DEBUG] Processing comment update - commentId: ${data.commentId}, newMentionIds:`, data.newMentionIds);

    const comment = await this.prismaService.comment.findUnique({
      where: { id: data.commentId },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            workspaceId: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    if (!comment) {
      this.logger.error(
        `[ERROR] Comment not found during update`,
        JSON.stringify({
          commentId: data.commentId,
          newMentionIds: data.newMentionIds,
          error: "Comment not found in database",
        }),
      );
      return;
    }

    const document = comment.document;
    const actorName = comment.createdBy.displayName || comment.createdBy.email;

    this.logger.log(`[DEBUG] Processing ${data.newMentionIds.length} new mentions for comment ${comment.id}`);

    // Notify newly mentioned users
    for (const mentionedUserId of data.newMentionIds) {
      this.logger.log(`[DEBUG] Processing new mention for user: ${mentionedUserId}`);

      try {
        // Skip if mentioning self
        if (mentionedUserId === comment.createdBy.id) {
          this.logger.log(`[DEBUG] Skipping self-mention in comment update`);
          continue;
        }

        // Check if mentioned user exists
        const mentionedUser = await this.prismaService.user.findUnique({
          where: { id: mentionedUserId },
          select: { id: true, email: true },
        });

        if (!mentionedUser) {
          this.logger.error(
            `[ERROR] Mentioned user does not exist in comment update: ${mentionedUserId}`,
            JSON.stringify({
              commentId: comment.id,
              mentionedUserId,
              documentId: document.id,
              error: "User not found in database",
            }),
          );
          continue;
        }

        // TODO: Re-enable permission check after verifying notification flow works
        // const hasAccess = await this.checkDocumentAccess(mentionedUserId, document.id, document.workspaceId);
        // if (!hasAccess) {
        //   this.logger.warn(`User ${mentionedUserId} does not have access to document ${document.id}, skipping mention notification`);
        //   continue;
        // }

        // Create notification (permission check temporarily disabled for testing)
        this.logger.log(`[DEBUG] Creating COMMENT_MENTION notification for newly mentioned user: ${mentionedUserId} (${mentionedUser.email})`);
        await this.notificationService.createNotification({
          userId: mentionedUserId,
          event: NotificationEventType.COMMENT_MENTION,
          workspaceId: document.workspaceId,
          documentId: document.id,
          actorId: comment.createdBy.id,
          metadata: {
            commentId: comment.id,
            documentTitle: document.title,
            isReply: !!comment.parentCommentId,
            actorName,
          },
        });
        this.logger.log(`[DEBUG] COMMENT_MENTION notification created successfully for newly mentioned ${mentionedUser.email}`);
      } catch (error) {
        const err = error as any;
        this.logger.error(
          `[ERROR] Failed to create mention notification in comment update for user ${mentionedUserId}`,
          JSON.stringify({
            commentId: comment.id,
            mentionedUserId,
            documentId: document.id,
            error: err?.message || String(error),
            errorCode: err?.code,
            errorStack: err?.stack,
          }),
        );
        // Don't throw - continue with other mentions
      }
    }

    this.logger.log(`Processed comment-updated notifications for comment: ${comment.id}`);
  }

  /**
   * Handle comment resolved event
   * Notify all participants in the thread
   */
  private async handleCommentResolved(data: CommentResolvedJobData) {
    this.logger.log(`[DEBUG] Processing comment resolved - commentId: ${data.commentId}, resolvedById: ${data.resolvedById}`);

    const comment = await this.prismaService.comment.findUnique({
      where: { id: data.commentId },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            workspaceId: true,
          },
        },
      },
    });

    if (!comment) {
      this.logger.error(
        `[ERROR] Comment not found during resolution`,
        JSON.stringify({
          commentId: data.commentId,
          resolvedById: data.resolvedById,
          error: "Comment not found in database",
        }),
      );
      return;
    }

    const document = comment.document;

    // Get resolver's name
    const resolver = await this.prismaService.user.findUnique({
      where: { id: data.resolvedById },
      select: {
        displayName: true,
        email: true,
      },
    });

    if (!resolver) {
      this.logger.error(
        `[ERROR] Resolver not found`,
        JSON.stringify({
          commentId: data.commentId,
          resolvedById: data.resolvedById,
          error: "Resolver user not found in database",
        }),
      );
      return;
    }

    const actorName = resolver.displayName || resolver.email;

    this.logger.log(`[DEBUG] Comment resolved by ${actorName} (${resolver.email})`);

    // Get all comments in thread
    const thread = await this.prismaService.comment.findMany({
      where: {
        OR: [{ id: data.commentId }, { parentCommentId: data.commentId }],
        deletedAt: null,
      },
      select: {
        id: true,
        data: true,
        createdById: true,
      },
    });

    this.logger.log(`[DEBUG] Found ${thread.length} comments in thread`);

    // Collect all participants (comment authors + mentioned users)
    const participants = new Set<string>();

    for (const threadComment of thread) {
      // Add comment author
      participants.add(threadComment.createdById);

      // Add mentioned users
      const mentions = parseMentions(threadComment.data as JSONContent);
      const mentionedUserIds = getUniqueMentionedUserIds(mentions);
      mentionedUserIds.forEach((userId) => participants.add(userId));
    }

    this.logger.log(`[DEBUG] Collected ${participants.size} participants before filtering`);

    // Remove the resolver from recipients
    participants.delete(data.resolvedById);

    this.logger.log(`[DEBUG] Notifying ${participants.size} participants about comment resolution`);

    // Notify all participants
    for (const participantId of participants) {
      try {
        this.logger.log(`[DEBUG] Creating COMMENT_RESOLVED notification for participant: ${participantId}`);
        await this.notificationService.createNotification({
          userId: participantId,
          event: NotificationEventType.COMMENT_RESOLVED,
          workspaceId: document.workspaceId,
          documentId: document.id,
          actorId: data.resolvedById,
          metadata: {
            commentId: comment.id,
            documentTitle: document.title,
            actorName,
          },
        });
        this.logger.log(`[DEBUG] COMMENT_RESOLVED notification created successfully for participant ${participantId}`);
      } catch (error) {
        const err = error as any;
        this.logger.error(
          `[ERROR] Failed to create resolved notification for participant ${participantId}`,
          JSON.stringify({
            commentId: comment.id,
            participantId,
            documentId: document.id,
            resolvedById: data.resolvedById,
            error: err?.message || String(error),
            errorCode: err?.code,
            errorStack: err?.stack,
          }),
        );
        // Don't throw - continue with other participants
      }
    }

    this.logger.log(`Processed comment-resolved notifications for comment: ${comment.id}`);
  }

  /**
   * Check if user has access to a document
   */
  private async checkDocumentAccess(userId: string, documentId: string, workspaceId: string): Promise<boolean> {
    try {
      const doc = await this.prismaService.doc.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          parentId: true,
          subspaceId: true,
          workspaceId: true,
          title: true,
        },
      });

      if (!doc) {
        this.logger.warn(`Document ${documentId} not found`);
        return false;
      }

      this.logger.log(`[DEBUG] Checking access for user ${userId} to document ${documentId} in workspace ${workspaceId}, subspace: ${doc.subspaceId}`);

      const permission = await this.docPermissionService.resolveUserPermissionForDocument(userId, doc);

      this.logger.log(`[DEBUG] Permission result: level=${permission.level}, source=${permission.source}, priority=${permission.priority}`);

      // Need at least READ permission
      const hasAccess = permission.level !== "NONE";
      this.logger.log(`[DEBUG] User ${userId} has access to document: ${hasAccess}`);

      return hasAccess;
    } catch (error) {
      this.logger.error(`Error checking document access for user ${userId}:`, error);
      return false;
    }
  }
}
