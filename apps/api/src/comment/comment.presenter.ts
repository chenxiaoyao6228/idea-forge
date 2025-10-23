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

    // Extract anchor text if requested
    if (options?.includeAnchorText) {
      const anchorText = await this.extractAnchorText(comment.documentId, comment.id);
      if (anchorText) {
        presented.anchorText = anchorText;
      }
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
   * Extract anchor text for a comment from the document
   * This finds the text that was selected when the comment was created
   */
  private async extractAnchorText(documentId: string, commentId: string): Promise<string | null> {
    try {
      const doc = await this.prismaService.doc.findUnique({
        where: { id: documentId },
        select: { content: true },
      });

      if (!doc || !doc.content) {
        return null;
      }

      const tiptapContent = JSON.parse(doc.content);
      const anchorText = this.findCommentMarkText(tiptapContent, commentId);

      return anchorText;
    } catch (error) {
      // If extraction fails, return null
      return null;
    }
  }

  /**
   * Recursively search TipTap JSON for comment mark and extract text
   */
  private findCommentMarkText(node: any, commentId: string): string | null {
    // If this is a text node, check if it has the comment mark
    if (node.type === "text" && node.marks) {
      const commentMark = node.marks.find((mark: any) => mark.type === "commentMark" && mark.attrs?.id === commentId);

      if (commentMark) {
        return node.text || null;
      }
    }

    // Recursively search child nodes
    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        const text = this.findCommentMarkText(child, commentId);
        if (text) {
          return text;
        }
      }
    }

    return null;
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
