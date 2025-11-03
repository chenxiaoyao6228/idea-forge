import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import {
  CreateCommentRequest,
  ListCommentsRequest,
  UpdateCommentRequest,
  CommentStatusFilter,
  CommentCreatedJobData,
  CommentUpdatedJobData,
  CommentResolvedJobData,
} from "@idea/contracts";
import { Comment, Prisma } from "@prisma/client";
import { CommentPresenter } from "./comment.presenter";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";
import { BusinessEvents } from "@/_shared/socket/business-event.constant";
import { parseMentions, calculateMentionDiff, getUniqueMentionedUserIds } from "@/editor/mention-parser";
import type { JSONContent } from "@tiptap/core";

@Injectable()
export class CommentService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly commentPresenter: CommentPresenter,
    private readonly eventPublisher: EventPublisherService,
    @InjectQueue("comments") private readonly commentQueue: Queue,
  ) {}

  /**
   * Create a new comment or reply
   */
  async create(userId: string, dto: CreateCommentRequest) {
    // Convert text to TipTap if provided
    let data = dto.data;
    if (!data && dto.text) {
      data = this.textToTiptap(dto.text);
    }

    // Create comment
    const comment = await this.prismaService.comment.create({
      data: {
        id: dto.id,
        data,
        documentId: dto.documentId,
        parentCommentId: dto.parentCommentId,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
            imageUrl: true,
          },
        },
        parentComment: true,
        document: {
          select: {
            workspaceId: true,
          },
        },
      },
    });

    // Queue background job for notifications
    await this.commentQueue.add("comment-created", {
      commentId: comment.id,
      userId,
    } as CommentCreatedJobData);

    // Publish WebSocket event for real-time sync
    const presented = await this.commentPresenter.present(comment);
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.COMMENT_CREATED,
      workspaceId: comment.document.workspaceId,
      actorId: userId,
      data: {
        documentId: comment.documentId,
        payload: presented,
      },
      timestamp: new Date().toISOString(),
    });

    return comment;
  }

  /**
   * List comments with filtering and pagination
   */
  async list(userId: string, dto: ListCommentsRequest) {
    const where: Prisma.CommentWhereInput = {
      deletedAt: null, // Exclude soft-deleted comments
    };

    // Filter by document
    if (dto.documentId) {
      where.documentId = dto.documentId;
    }

    // Filter by workspace (get all documents in workspace)
    if (dto.workspaceId && !dto.documentId) {
      where.document = {
        workspaceId: dto.workspaceId,
      };
    }

    // Filter by parent (get replies to specific comment)
    if (dto.parentCommentId) {
      where.parentCommentId = dto.parentCommentId;
    }

    // Filter by resolution status
    if (dto.statusFilter && dto.statusFilter.length > 0) {
      if (dto.statusFilter.includes(CommentStatusFilter.RESOLVED) && !dto.statusFilter.includes(CommentStatusFilter.UNRESOLVED)) {
        where.resolvedAt = { not: null };
      } else if (dto.statusFilter.includes(CommentStatusFilter.UNRESOLVED) && !dto.statusFilter.includes(CommentStatusFilter.RESOLVED)) {
        where.resolvedAt = null;
      }
      // If both or neither are specified, don't filter by resolution status
    }

    // Count total for pagination
    const total = await this.prismaService.comment.count({ where });

    // Fetch comments with pagination
    const comments = await this.prismaService.comment.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
            imageUrl: true,
          },
        },
        resolvedBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
            imageUrl: true,
          },
        },
        parentComment: true,
      },
      orderBy: {
        [dto.sort]: dto.direction.toLowerCase(),
      },
      skip: dto.offset,
      take: dto.limit,
    });

    // Present comments
    const presented = await this.commentPresenter.presentMany(comments, {
      includeAnchorText: dto.includeAnchorText,
    });

    return {
      data: presented,
      pagination: {
        offset: dto.offset,
        limit: dto.limit,
        total,
      },
    };
  }

  /**
   * Get a single comment by ID
   */
  async findById(id: string) {
    const comment = await this.prismaService.comment.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
            imageUrl: true,
          },
        },
        resolvedBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
            imageUrl: true,
          },
        },
        parentComment: true,
      },
    });

    if (!comment || comment.deletedAt) {
      throw new NotFoundException("Comment not found");
    }

    return comment;
  }

  /**
   * Update comment content
   */
  async update(id: string, dto: UpdateCommentRequest) {
    const comment = await this.findById(id);

    // Calculate mention diff - only new mentions need notifications
    const newMentions = calculateMentionDiff(comment.data as JSONContent, dto.data as JSONContent);
    const newMentionIds = getUniqueMentionedUserIds(newMentions);

    // Update comment
    const updated = await this.prismaService.comment.update({
      where: { id },
      data: {
        data: dto.data,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
            imageUrl: true,
          },
        },
        resolvedBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
            imageUrl: true,
          },
        },
        parentComment: true,
        document: {
          select: {
            workspaceId: true,
          },
        },
      },
    });

    // Queue notification for new mentions
    if (newMentionIds.length > 0) {
      await this.commentQueue.add("comment-updated", {
        commentId: id,
        newMentionIds,
      } as CommentUpdatedJobData);
    }

    // Publish WebSocket event for real-time sync
    const presented = await this.commentPresenter.present(updated);
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.COMMENT_UPDATED,
      workspaceId: updated.document.workspaceId,
      actorId: comment.createdById,
      data: {
        documentId: updated.documentId,
        payload: presented,
      },
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  /**
   * Resolve a comment thread
   * Only top-level comments can be resolved
   */
  async resolve(id: string, userId: string) {
    const comment = await this.findById(id);

    // Validate it's a top-level comment
    if (comment.parentCommentId) {
      throw new BadRequestException("Only top-level comments can be resolved");
    }

    // Validate not already resolved
    if (comment.resolvedAt) {
      throw new BadRequestException("Comment is already resolved");
    }

    // Update comment
    const updated = await this.prismaService.comment.update({
      where: { id },
      data: {
        resolvedAt: new Date(),
        resolvedById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
            imageUrl: true,
          },
        },
        resolvedBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
            imageUrl: true,
          },
        },
        parentComment: true,
        document: {
          select: {
            workspaceId: true,
          },
        },
      },
    });

    // Queue notification for resolution
    await this.commentQueue.add("comment-resolved", {
      commentId: id,
      resolvedById: userId,
    } as CommentResolvedJobData);

    // Publish WebSocket event for real-time sync
    const presented = await this.commentPresenter.present(updated);
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.COMMENT_RESOLVED,
      workspaceId: updated.document.workspaceId,
      actorId: userId,
      data: {
        documentId: updated.documentId,
        payload: presented,
      },
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  /**
   * Unresolve a comment thread
   */
  async unresolve(id: string) {
    const comment = await this.findById(id);

    // Validate it's a top-level comment
    if (comment.parentCommentId) {
      throw new BadRequestException("Only top-level comments can be unresolved");
    }

    // Validate it's resolved
    if (!comment.resolvedAt) {
      throw new BadRequestException("Comment is not resolved");
    }

    // Update comment
    const updated = await this.prismaService.comment.update({
      where: { id },
      data: {
        resolvedAt: null,
        resolvedById: null,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
            imageUrl: true,
          },
        },
        resolvedBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
            imageUrl: true,
          },
        },
        parentComment: true,
        document: {
          select: {
            workspaceId: true,
          },
        },
      },
    });

    // Publish WebSocket event for real-time sync
    const presented = await this.commentPresenter.present(updated);
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.COMMENT_UNRESOLVED,
      workspaceId: updated.document.workspaceId,
      actorId: comment.createdById,
      data: {
        documentId: updated.documentId,
        payload: presented,
      },
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  /**
   * Add a reaction to a comment
   */
  async addReaction(commentId: string, userId: string, emoji: string) {
    // Create or find reaction
    await this.prismaService.reaction.upsert({
      where: {
        commentId_userId_emoji: {
          commentId,
          userId,
          emoji,
        },
      },
      create: {
        commentId,
        userId,
        emoji,
      },
      update: {}, // No update needed if exists
    });

    // Aggregate reactions and update comment
    const reactions = await this.commentPresenter.aggregateReactions(commentId);
    const updatedComment = await this.prismaService.comment.update({
      where: { id: commentId },
      data: {
        reactions: reactions as any,
      },
      include: {
        document: {
          select: {
            workspaceId: true,
          },
        },
      },
    });

    // Publish WebSocket event for real-time sync
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.COMMENT_REACTION_ADDED,
      workspaceId: updatedComment.document.workspaceId,
      actorId: userId,
      data: {
        documentId: updatedComment.documentId,
        payload: { commentId, userId, emoji, reactions },
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Remove a reaction from a comment
   */
  async removeReaction(commentId: string, userId: string, emoji: string) {
    // Delete reaction
    await this.prismaService.reaction.deleteMany({
      where: {
        commentId,
        userId,
        emoji,
      },
    });

    // Aggregate reactions and update comment
    const reactions = await this.commentPresenter.aggregateReactions(commentId);
    const updatedComment = await this.prismaService.comment.update({
      where: { id: commentId },
      data: {
        reactions: reactions as any,
      },
      include: {
        document: {
          select: {
            workspaceId: true,
          },
        },
      },
    });

    // Publish WebSocket event for real-time sync
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.COMMENT_REACTION_REMOVED,
      workspaceId: updatedComment.document.workspaceId,
      actorId: userId,
      data: {
        documentId: updatedComment.documentId,
        payload: { commentId, userId, emoji, reactions },
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Soft delete a comment
   * Cascade deletes all replies
   */
  async delete(id: string) {
    const comment = await this.findById(id);

    // Get workspaceId for WebSocket event
    const document = await this.prismaService.doc.findUnique({
      where: { id: comment.documentId },
      select: { workspaceId: true },
    });

    if (!document) {
      throw new NotFoundException("Document not found");
    }

    // If it's a top-level comment, also soft-delete all replies
    if (!comment.parentCommentId) {
      await this.prismaService.comment.updateMany({
        where: {
          parentCommentId: id,
        },
        data: {
          deletedAt: new Date(),
        },
      });
    }

    // Soft delete the comment
    await this.prismaService.comment.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    // Publish WebSocket event for real-time sync
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.COMMENT_DELETED,
      workspaceId: document.workspaceId,
      actorId: comment.createdById,
      data: {
        documentId: comment.documentId,
        payload: { id },
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get all comments in a thread (parent + replies)
   */
  async getThread(threadId: string) {
    const thread = await this.prismaService.comment.findMany({
      where: {
        OR: [{ id: threadId }, { parentCommentId: threadId }],
        deletedAt: null,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
            imageUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return thread;
  }

  /**
   * Count unresolved comments in a document
   */
  async countUnresolved(documentId: string): Promise<number> {
    return this.prismaService.comment.count({
      where: {
        documentId,
        resolvedAt: null,
        parentCommentId: null, // Only count top-level threads
        deletedAt: null,
      },
    });
  }

  /**
   * Convert plain text to TipTap JSON format
   */
  private textToTiptap(text: string): any {
    return {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text,
            },
          ],
        },
      ],
    };
  }
}
