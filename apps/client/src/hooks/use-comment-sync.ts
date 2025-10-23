import { useEffect, useRef } from "react";
import { getWebsocketService } from "@/lib/websocket";
import { addComment, updateComment, removeComment, useFindComment, type CommentEntity } from "@/stores/comment-store";
import type {
  CommentCreatedEvent,
  CommentUpdatedEvent,
  CommentResolvedEvent,
  CommentUnresolvedEvent,
  CommentDeletedEvent,
  ReactionAddedEvent,
  ReactionRemovedEvent,
} from "@idea/contracts";
import { toast } from "sonner";
import type { Editor } from "@tiptap/react";

interface UseCommentSyncOptions {
  documentId: string;
  editor?: Editor | null;
  onCommentFocus?: (commentId: string) => void;
}

/**
 * Hook to sync comments in real-time via Socket.io
 * Handles all comment events and updates local state + editor marks
 */
export function useCommentSync({ documentId, editor, onCommentFocus }: UseCommentSyncOptions) {
  const findComment = useFindComment();
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!documentId || subscribedRef.current) return;

    const websocketService = getWebsocketService();
    const socket = websocketService.socket;

    if (!socket) {
      console.warn("[comment-sync]: Socket not available");
      return;
    }

    // Subscribe to document room
    socket.emit("comment:subscribe", { documentId });
    subscribedRef.current = true;

    // Handle comment created
    const handleCommentCreated = (event: CommentCreatedEvent) => {
      const comment = event.payload as CommentEntity;

      // Add to store
      addComment(comment);

      // Add mark to editor if it's a top-level comment
      if (editor && !comment.parentCommentId && comment.id) {
        editor.commands.setCommentMark({
          id: comment.id,
          userId: comment.createdById,
          draft: false,
          resolved: false,
        });
      }

      // Show notification
      if (comment.createdBy) {
        toast.info(`${comment.createdBy.displayName || comment.createdBy.email} added a comment`);
      }
    };

    // Handle comment updated
    const handleCommentUpdated = (event: CommentUpdatedEvent) => {
      const comment = event.payload as CommentEntity;

      // Update store
      updateComment(comment.id, comment);

      toast.info("Comment updated");
    };

    // Handle comment resolved
    const handleCommentResolved = (event: CommentResolvedEvent) => {
      const comment = event.payload as CommentEntity;

      // Update store
      updateComment(comment.id, {
        resolvedAt: comment.resolvedAt,
        resolvedById: comment.resolvedById,
      });

      // Update mark in editor
      if (editor && !comment.parentCommentId) {
        editor.commands.updateCommentMark(comment.id, { resolved: true });
      }

      toast.success("Comment resolved");
    };

    // Handle comment unresolved
    const handleCommentUnresolved = (event: CommentUnresolvedEvent) => {
      const comment = event.payload as CommentEntity;

      // Update store
      updateComment(comment.id, {
        resolvedAt: null,
        resolvedById: null,
      });

      // Update mark in editor
      if (editor && !comment.parentCommentId) {
        editor.commands.updateCommentMark(comment.id, { resolved: false });
      }

      toast.info("Comment reopened");
    };

    // Handle comment deleted
    const handleCommentDeleted = (event: CommentDeletedEvent) => {
      const { id } = event.payload;

      // Find comment to check if it's top-level
      const comment = findComment(id);

      // Remove from store
      removeComment(id);

      // Remove mark from editor if it's a top-level comment
      if (editor && comment && !comment.parentCommentId) {
        editor.commands.unsetCommentMark(id);
      }

      toast.info("Comment deleted");
    };

    // Handle reaction added
    const handleReactionAdded = (event: ReactionAddedEvent) => {
      const { commentId, emoji, userId } = event.payload;

      const comment = findComment(commentId);
      if (!comment) return;

      // Update reactions in store
      const updatedReactions = [...(comment.reactions || [])];
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
    };

    // Handle reaction removed
    const handleReactionRemoved = (event: ReactionRemovedEvent) => {
      const { commentId, emoji, userId } = event.payload;

      const comment = findComment(commentId);
      if (!comment) return;

      // Update reactions in store
      const updatedReactions = (comment.reactions || [])
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
    };

    // Subscribe to events
    socket.on("comment.created", handleCommentCreated);
    socket.on("comment.updated", handleCommentUpdated);
    socket.on("comment.resolved", handleCommentResolved);
    socket.on("comment.unresolved", handleCommentUnresolved);
    socket.on("comment.deleted", handleCommentDeleted);
    socket.on("comment.reaction_added", handleReactionAdded);
    socket.on("comment.reaction_removed", handleReactionRemoved);

    // Cleanup
    return () => {
      socket.emit("comment:unsubscribe", { documentId });
      socket.off("comment.created", handleCommentCreated);
      socket.off("comment.updated", handleCommentUpdated);
      socket.off("comment.resolved", handleCommentResolved);
      socket.off("comment.unresolved", handleCommentUnresolved);
      socket.off("comment.deleted", handleCommentDeleted);
      socket.off("comment.reaction_added", handleReactionAdded);
      socket.off("comment.reaction_removed", handleReactionRemoved);
      subscribedRef.current = false;
    };
  }, [documentId, editor, findComment, onCommentFocus]);

  return {
    connected: getWebsocketService().isConnected(),
  };
}
