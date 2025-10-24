import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { NotificationService } from "@/notification/notification.service";
import { CommentCreatedJobData, CommentUpdatedJobData, CommentResolvedJobData, NotificationEventType } from "@idea/contracts";
import { DocPermissionResolveService } from "@/permission/document-permission.service";

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
    this.logger.log(`Processing job: ${job.name} with ID: ${job.id}`);

    try {
      switch (job.name) {
        case "comment-created":
          await this.handleCommentCreated(job.data as CommentCreatedJobData);
          break;
        case "comment-updated":
          await this.handleCommentUpdated(job.data as CommentUpdatedJobData);
          break;
        case "comment-resolved":
          await this.handleCommentResolved(job.data as CommentResolvedJobData);
          break;
        default:
          this.logger.warn(`Unknown job name: ${job.name}`);
      }
    } catch (error) {
      this.logger.error(`Error processing job ${job.name}:`, error);
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
      },
    });

    if (!comment) {
      this.logger.warn(`Comment not found: ${data.commentId}`);
      return;
    }

    const document = comment.document;

    // 1. TODO: Auto-subscribe commenter to document (when subscription system is implemented)
    // await this.subscriptionService.createOrUpdate({
    //   userId: data.userId,
    //   documentId: document.id,
    //   event: 'document',
    //   resubscribe: false,
    // });

    // 2. Notify mentioned users
    const mentions = this.parseMentions(comment.data);
    for (const mentionedUserId of mentions) {
      // Skip if mentioning self
      if (mentionedUserId === data.userId) {
        continue;
      }

      // Check they have access to document
      const hasAccess = await this.checkDocumentAccess(mentionedUserId, document.id, document.workspaceId);
      if (!hasAccess) {
        continue;
      }

      // Create notification
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
        },
      });
    }

    // 3. Notify document author (if not the commenter and not mentioned)
    if (document.authorId !== data.userId && !mentions.includes(document.authorId)) {
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
          },
        },
      },
    });

    if (!comment) {
      this.logger.warn(`Comment not found: ${data.commentId}`);
      return;
    }

    const document = comment.document;

    // Notify newly mentioned users
    for (const mentionedUserId of data.newMentionIds) {
      // Skip if mentioning self
      if (mentionedUserId === comment.createdBy.id) {
        continue;
      }

      // Check they have access to document
      const hasAccess = await this.checkDocumentAccess(mentionedUserId, document.id, document.workspaceId);
      if (!hasAccess) {
        continue;
      }

      // Create notification
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
        },
      });
    }

    this.logger.log(`Processed comment-updated notifications for comment: ${comment.id}`);
  }

  /**
   * Handle comment resolved event
   * Notify all participants in the thread
   */
  private async handleCommentResolved(data: CommentResolvedJobData) {
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
      this.logger.warn(`Comment not found: ${data.commentId}`);
      return;
    }

    const document = comment.document;

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

    // Collect all participants (comment authors + mentioned users)
    const participants = new Set<string>();

    for (const threadComment of thread) {
      // Add comment author
      participants.add(threadComment.createdById);

      // Add mentioned users
      const mentions = this.parseMentions(threadComment.data);
      mentions.forEach((userId) => participants.add(userId));
    }

    // Remove the resolver from recipients
    participants.delete(data.resolvedById);

    // Notify all participants
    for (const participantId of participants) {
      await this.notificationService.createNotification({
        userId: participantId,
        event: NotificationEventType.COMMENT_RESOLVED,
        workspaceId: document.workspaceId,
        documentId: document.id,
        actorId: data.resolvedById,
        metadata: {
          commentId: comment.id,
          documentTitle: document.title,
        },
      });
    }

    this.logger.log(`Processed comment-resolved notifications for comment: ${comment.id}`);
  }

  /**
   * Extract user IDs from TipTap mention nodes
   */
  private parseMentions(data: any): string[] {
    const mentions: string[] = [];

    const traverse = (node: any) => {
      if (node.type === "mention" && node.attrs?.id) {
        mentions.push(node.attrs.id);
      }
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach(traverse);
      }
    };

    if (data) {
      traverse(data);
    }

    return [...new Set(mentions)]; // Remove duplicates
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
        },
      });

      if (!doc) {
        return false;
      }

      const permission = await this.docPermissionService.resolveUserPermissionForDocument(userId, doc);
      // Need at least READ permission
      return permission.level !== "NONE";
    } catch (error) {
      this.logger.error(`Error checking document access for user ${userId}:`, error);
      return false;
    }
  }
}
