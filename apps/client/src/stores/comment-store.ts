import { create } from "zustand";
import { useMemo, useCallback } from "react";
import { toast } from "sonner";
import useRequest from "@ahooksjs/use-request";
import { useRefCallback } from "@/hooks/use-ref-callback";
import type { CommentDto, CreateCommentRequest, UpdateCommentRequest, ListCommentsRequest, ReactionSummary, CommentSortType } from "@idea/contracts";
import { commentApi } from "@/apis/comment";

// Comment entity is just the DTO (already includes all fields we need)
export type CommentEntity = CommentDto;

// Minimal store - only state
const useCommentStore = create<{
  comments: Map<string, CommentEntity>;
}>(() => ({
  comments: new Map(),
}));

// ============================================
// Basic Data Access
// ============================================

export const useComments = () => {
  return useCommentStore((state) => state.comments);
};

// ============================================
// Store Update Helpers
// ============================================

export const setComments = (comments: CommentEntity[]) => {
  const commentsMap = new Map<string, CommentEntity>();
  comments.forEach((comment) => {
    commentsMap.set(comment.id, comment);
  });
  useCommentStore.setState({ comments: commentsMap });
};

export const addComment = (comment: CommentEntity) => {
  useCommentStore.setState((state) => {
    const newComments = new Map(state.comments);
    newComments.set(comment.id, comment);
    return { comments: newComments };
  });
};

export const addComments = (comments: CommentEntity[]) => {
  useCommentStore.setState((state) => {
    const newComments = new Map(state.comments);
    comments.forEach((comment) => {
      newComments.set(comment.id, comment);
    });
    return { comments: newComments };
  });
};

export const updateComment = (id: string, updates: Partial<CommentEntity>) => {
  useCommentStore.setState((state) => {
    const newComments = new Map(state.comments);
    const existing = newComments.get(id);
    if (existing) {
      newComments.set(id, { ...existing, ...updates });
    }
    return { comments: newComments };
  });
};

export const removeComment = (id: string) => {
  useCommentStore.setState((state) => {
    const newComments = new Map(state.comments);
    newComments.delete(id);
    return { comments: newComments };
  });
};

export const clearComments = () => {
  useCommentStore.setState({ comments: new Map() });
};

// ============================================
// Computed Values
// ============================================

/**
 * Get all comments for a document (top-level + replies)
 */
export const useCommentsInDocument = (documentId?: string) => {
  const comments = useCommentStore((state) => state.comments);

  return useMemo(() => {
    if (!documentId) return [];
    return Array.from(comments.values()).filter((c) => c.documentId === documentId && !c.deletedAt);
  }, [comments, documentId]);
};

/**
 * Get all top-level comment threads for a document
 */
export const useThreadsInDocument = (documentId?: string, sortType: "mostRecent" | "orderInDocument" = "mostRecent", referencedCommentIds?: string[]) => {
  const comments = useCommentsInDocument(documentId);

  return useMemo(() => {
    // Filter to only top-level comments (threads)
    let threads = comments.filter((c) => !c.parentCommentId);

    // Sort based on type
    if (sortType === "mostRecent") {
      threads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortType === "orderInDocument" && referencedCommentIds) {
      // Sort by document order
      const referenced = threads.filter((c) => referencedCommentIds.includes(c.id));
      const unreferenced = threads.filter((c) => !referencedCommentIds.includes(c.id));

      referenced.sort((a, b) => referencedCommentIds.indexOf(a.id) - referencedCommentIds.indexOf(b.id));

      threads = [...referenced, ...unreferenced];
    }

    return threads;
  }, [comments, sortType, referencedCommentIds]);
};

/**
 * Get resolved threads in a document
 */
export const useResolvedThreadsInDocument = (documentId?: string, sortType?: "mostRecent" | "orderInDocument", referencedCommentIds?: string[]) => {
  const threads = useThreadsInDocument(documentId, sortType, referencedCommentIds);

  return useMemo(() => {
    return threads.filter((c) => c.resolvedAt !== null);
  }, [threads]);
};

/**
 * Get unresolved threads in a document
 */
export const useUnresolvedThreadsInDocument = (documentId?: string, sortType?: "mostRecent" | "orderInDocument", referencedCommentIds?: string[]) => {
  const threads = useThreadsInDocument(documentId, sortType, referencedCommentIds);

  return useMemo(() => {
    return threads.filter((c) => c.resolvedAt === null);
  }, [threads]);
};

/**
 * Get all comments in a thread (parent + replies)
 */
export const useCommentsInThread = (threadId?: string) => {
  const comments = useCommentStore((state) => state.comments);

  return useMemo(() => {
    if (!threadId) return [];

    const commentsArray = Array.from(comments.values());
    const parent = commentsArray.find((c) => c.id === threadId);
    if (!parent) return [];

    const replies = commentsArray
      .filter((c) => c.parentCommentId === threadId && !c.deletedAt)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return [parent, ...replies];
  }, [comments, threadId]);
};

/**
 * Count unresolved comments in a document
 */
export const useUnresolvedCommentCount = (documentId?: string) => {
  const unresolvedThreads = useUnresolvedThreadsInDocument(documentId);
  return unresolvedThreads.length;
};

/**
 * Find a comment by ID
 */
export const useFindComment = () => {
  const comments = useCommentStore((state) => state.comments);

  return useRefCallback((id?: string) => {
    if (!id) return undefined;
    return comments.get(id);
  });
};

// ============================================
// API Request Hooks
// ============================================

/**
 * Fetch comments for a document
 */
export const useFetchComments = () => {
  return useRequest(
    async (params: ListCommentsRequest) => {
      try {
        const response = await commentApi.list(params);

        // Add to store
        addComments(response.data);

        return response;
      } catch (error: any) {
        console.error("Failed to fetch comments:", error);
        toast.error("Failed to fetch comments", {
          description: error.message,
        });
        throw error;
      }
    },
    {
      manual: true,
    },
  );
};

/**
 * Create a new comment or reply
 */
export const useCreateComment = () => {
  return useRequest(
    async (dto: CreateCommentRequest) => {
      try {
        const response = await commentApi.create(dto);
        const comment = response.comment;

        // Add to store
        addComment(comment);

        return comment;
      } catch (error: any) {
        console.error("Failed to create comment:", error);
        toast.error("Failed to create comment", {
          description: error.message,
        });
        throw error;
      }
    },
    {
      manual: true,
    },
  );
};

/**
 * Update a comment
 */
export const useUpdateComment = () => {
  return useRequest(
    async (dto: UpdateCommentRequest) => {
      try {
        // Get original for rollback
        const original = useCommentStore.getState().comments.get(dto.id);

        // Optimistic update
        updateComment(dto.id, { data: dto.data });

        try {
          const response = await commentApi.update(dto);
          const comment = response.comment;

          // Confirm with server data
          updateComment(dto.id, comment);

          return comment;
        } catch (error) {
          // Rollback on failure
          if (original) {
            updateComment(dto.id, { data: original.data });
          }
          throw error;
        }
      } catch (error: any) {
        console.error("Failed to update comment:", error);
        toast.error("Failed to update comment", {
          description: error.message,
        });
        throw error;
      }
    },
    {
      manual: true,
    },
  );
};

/**
 * Resolve a comment thread
 */
export const useResolveComment = () => {
  return useRequest(
    async (id: string, userId: string) => {
      try {
        // Get original for rollback
        const original = useCommentStore.getState().comments.get(id);

        // Optimistic update
        const now = new Date().toISOString();
        updateComment(id, {
          resolvedAt: now,
          resolvedById: userId,
        });

        try {
          const response = await commentApi.resolve(id);
          const comment = response.comment;

          // Confirm with server data
          updateComment(id, comment);

          toast.success("Comment resolved");

          return comment;
        } catch (error) {
          // Rollback on failure
          if (original) {
            updateComment(id, {
              resolvedAt: original.resolvedAt,
              resolvedById: original.resolvedById,
            });
          }
          throw error;
        }
      } catch (error: any) {
        console.error("Failed to resolve comment:", error);
        toast.error("Failed to resolve comment", {
          description: error.message,
        });
        throw error;
      }
    },
    {
      manual: true,
    },
  );
};

/**
 * Unresolve a comment thread
 */
export const useUnresolveComment = () => {
  return useRequest(
    async (id: string) => {
      try {
        // Get original for rollback
        const original = useCommentStore.getState().comments.get(id);

        // Optimistic update
        updateComment(id, {
          resolvedAt: null,
          resolvedById: null,
        });

        try {
          const response = await commentApi.unresolve(id);
          const comment = response.comment;

          // Confirm with server data
          updateComment(id, comment);

          toast.success("Comment unresolved");

          return comment;
        } catch (error) {
          // Rollback on failure
          if (original) {
            updateComment(id, {
              resolvedAt: original.resolvedAt,
              resolvedById: original.resolvedById,
            });
          }
          throw error;
        }
      } catch (error: any) {
        console.error("Failed to unresolve comment:", error);
        toast.error("Failed to unresolve comment", {
          description: error.message,
        });
        throw error;
      }
    },
    {
      manual: true,
    },
  );
};

/**
 * Add a reaction to a comment
 */
export const useAddReaction = () => {
  return useRequest(
    async (params: { commentId: string; emoji: string; userId: string }) => {
      try {
        const { commentId, emoji, userId } = params;

        // Get original for rollback
        const original = useCommentStore.getState().comments.get(commentId);
        if (!original) throw new Error("Comment not found");

        // Optimistic update
        const updatedReactions = [...(original.reactions || [])];
        const existing = updatedReactions.find((r) => r.emoji === emoji);

        if (existing) {
          if (!existing.userIds.includes(userId)) {
            existing.userIds.push(userId);
          }
        } else {
          updatedReactions.push({
            emoji,
            userIds: [userId],
          });
        }

        updateComment(commentId, { reactions: updatedReactions });

        try {
          await commentApi.addReaction(commentId, emoji);
        } catch (error) {
          // Rollback on failure
          updateComment(commentId, { reactions: original.reactions });
          throw error;
        }
      } catch (error: any) {
        console.error("Failed to add reaction:", error);
        toast.error("Failed to add reaction", {
          description: error.message,
        });
        throw error;
      }
    },
    {
      manual: true,
    },
  );
};

/**
 * Remove a reaction from a comment
 */
export const useRemoveReaction = () => {
  return useRequest(
    async (params: { commentId: string; emoji: string; userId: string }) => {
      try {
        const { commentId, emoji, userId } = params;

        // Get original for rollback
        const original = useCommentStore.getState().comments.get(commentId);
        if (!original) throw new Error("Comment not found");

        // Optimistic update
        const updatedReactions = (original.reactions || [])
          .map((r) => {
            if (r.emoji === emoji) {
              return {
                ...r,
                userIds: r.userIds.filter((uid) => uid !== userId),
              };
            }
            return r;
          })
          .filter((r) => r.userIds.length > 0);

        updateComment(commentId, { reactions: updatedReactions });

        try {
          await commentApi.removeReaction(commentId, emoji);
        } catch (error) {
          // Rollback on failure
          updateComment(commentId, { reactions: original.reactions });
          throw error;
        }
      } catch (error: any) {
        console.error("Failed to remove reaction:", error);
        toast.error("Failed to remove reaction", {
          description: error.message,
        });
        throw error;
      }
    },
    {
      manual: true,
    },
  );
};

/**
 * Delete a comment
 */
export const useDeleteComment = () => {
  return useRequest(
    async (id: string) => {
      try {
        // Get original for rollback (including replies if top-level)
        const commentsMap = useCommentStore.getState().comments;
        const original = commentsMap.get(id);
        if (!original) throw new Error("Comment not found");

        const replies = original.parentCommentId ? [] : Array.from(commentsMap.values()).filter((c) => c.parentCommentId === id);

        // Optimistic delete
        removeComment(id);
        replies.forEach((reply) => removeComment(reply.id));

        try {
          await commentApi.delete(id);

          toast.success("Comment deleted");
        } catch (error) {
          // Rollback on failure
          addComment(original);
          replies.forEach((reply) => addComment(reply));
          throw error;
        }
      } catch (error: any) {
        console.error("Failed to delete comment:", error);
        toast.error("Failed to delete comment", {
          description: error.message,
        });
        throw error;
      }
    },
    {
      manual: true,
    },
  );
};

export default useCommentStore;
