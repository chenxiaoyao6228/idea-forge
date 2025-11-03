import { Injectable } from "@nestjs/common";
import { Comment, Reaction } from "@prisma/client";
import { CommentDto, ReactionSummary } from "@idea/contracts";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";

type CommentWithRelations = Comment & {
  createdBy?: {
    id: string;
    email: string;
    displayName: string | null;
    imageUrl: string | null;
  };
  resolvedBy?: {
    id: string;
    email: string;
    displayName: string | null;
    imageUrl: string | null;
  } | null;
  parentComment?: Comment | null;
  reactionsList?: Reaction[];
};

/**
 * Comment presenter
 * Transforms Comment model to API response format
 */
@Injectable()
export class CommentPresenter {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Present a single comment
   */
  async present(comment: CommentWithRelations, options?: { includeAnchorText?: boolean }): Promise<CommentDto> {
    const presented: CommentDto = {
      id: comment.id,
      data: comment.data as any,
      documentId: comment.documentId,
      parentCommentId: comment.parentCommentId,
      createdById: comment.createdById,
      createdBy: comment.createdBy,
      resolvedAt: comment.resolvedAt?.toISOString() ?? null,
      resolvedById: comment.resolvedById,
      resolvedBy: comment.resolvedBy ?? null,
      reactions: (comment.reactions as ReactionSummary[]) ?? [],
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      deletedAt: comment.deletedAt?.toISOString() ?? null,

      // Computed properties
      isReply: !!comment.parentCommentId,
    };

    // Compute isResolved (inherited from parent if it's a reply)
    if (comment.parentCommentId && comment.parentComment) {
      presented.isResolved = !!comment.resolvedAt || !!comment.parentComment.resolvedAt;
    } else {
      presented.isResolved = !!comment.resolvedAt;
    }

    return presented;
  }

  /**
   * Present multiple comments
   */
  async presentMany(comments: CommentWithRelations[], options?: { includeAnchorText?: boolean }): Promise<CommentDto[]> {
    return Promise.all(comments.map((comment) => this.present(comment, options)));
  }

  /**
   * Aggregate individual reactions into summary format
   * This is called when reactions change to update the comment.reactions JSON field
   */
  async aggregateReactions(commentId: string): Promise<ReactionSummary[]> {
    const reactions = await this.prismaService.reaction.findMany({
      where: { commentId },
      select: {
        emoji: true,
        userId: true,
      },
    });

    // Group by emoji
    const grouped = reactions.reduce(
      (acc, reaction) => {
        if (!acc[reaction.emoji]) {
          acc[reaction.emoji] = [];
        }
        acc[reaction.emoji].push(reaction.userId);
        return acc;
      },
      {} as Record<string, string[]>,
    );

    // Convert to array format
    return Object.entries(grouped).map(([emoji, userIds]) => ({
      emoji,
      userIds,
    }));
  }
}
