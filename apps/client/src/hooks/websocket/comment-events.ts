import { useEffect } from "react";
import { Socket } from "socket.io-client";
import { addComment, updateComment, removeComment, useFindComment, type CommentEntity } from "@/stores/comment-store";
import { SocketEvents } from "@/lib/websocket";
import { toast } from "sonner";
import { useEditorStore } from "@/stores/editor-store";
import { parseMentions, getUniqueMentionedUserIds } from "@idea/editor/server";
import type { JSONContent } from "@tiptap/core";
import useUserStore from "@/stores/user-store";

/**
 * Hook to handle comment-related WebSocket events
 * Returns cleanup function for proper event listener removal
 */
export function useCommentWebsocketEvents(socket: Socket | null) {
  const editor = useEditorStore((state) => state.editor);
  const findComment = useFindComment();
  const userInfo = useUserStore((state) => state.userInfo);

  useEffect(() => {
    if (!socket) return;

    const onCommentCreated = (comment: CommentEntity) => {
      console.log(`[websocket]: Received event ${SocketEvents.COMMENT_CREATED}:`, comment);

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
    };

    const onCommentUpdated = (comment: CommentEntity) => {
      console.log(`[websocket]: Received event ${SocketEvents.COMMENT_UPDATED}:`, comment);
      updateComment(comment.id, comment);
      // toast.info("Comment updated");
    };

    const onCommentDeleted = (event: { id: string }) => {
      console.log(`[websocket]: Received event ${SocketEvents.COMMENT_DELETED}:`, event);

      // Find comment to check if it's top-level
      const comment = findComment(event.id);

      // Remove from store
      removeComment(event.id);

      // Remove mark from editor if it's a top-level comment
      if (editor && comment && !comment.parentCommentId) {
        editor.commands.unsetCommentMark(event.id);
      }
    };

    const onCommentResolved = (comment: CommentEntity) => {
      console.log(`[websocket]: Received event ${SocketEvents.COMMENT_RESOLVED}:`, comment);

      // Update store
      updateComment(comment.id, {
        resolvedAt: comment.resolvedAt,
        resolvedById: comment.resolvedById,
        resolvedBy: comment.resolvedBy,
      });

      // Update mark in editor
      if (editor && !comment.parentCommentId) {
        editor.commands.updateCommentMark(comment.id, { resolved: true });
      }
    };

    const onCommentUnresolved = (comment: CommentEntity) => {
      console.log(`[websocket]: Received event ${SocketEvents.COMMENT_UNRESOLVED}:`, comment);

      // Update store
      updateComment(comment.id, {
        resolvedAt: null,
        resolvedById: null,
        resolvedBy: null,
      });

      // Update mark in editor
      if (editor && !comment.parentCommentId) {
        editor.commands.updateCommentMark(comment.id, { resolved: false });
      }
    };

    const onCommentReactionAdded = (event: { commentId: string; userId: string; emoji: string; reactions: any }) => {
      console.log(`[websocket]: Received event ${SocketEvents.COMMENT_REACTION_ADDED}:`, event);

      if (event.commentId && event.reactions) {
        updateComment(event.commentId, {
          reactions: event.reactions,
        });
        console.log(`[websocket]: Updated comment ${event.commentId} with reactions`);
      } else {
        console.warn(`[websocket]: Missing commentId or reactions in event`, event);
      }
    };

    const onCommentReactionRemoved = (event: { commentId: string; userId: string; emoji: string; reactions: any }) => {
      console.log(`[websocket]: Received event ${SocketEvents.COMMENT_REACTION_REMOVED}:`, event);
      updateComment(event.commentId, {
        reactions: event.reactions,
      });
    };

    // Register event listeners
    socket.on(SocketEvents.COMMENT_CREATED, onCommentCreated);
    socket.on(SocketEvents.COMMENT_UPDATED, onCommentUpdated);
    socket.on(SocketEvents.COMMENT_DELETED, onCommentDeleted);
    socket.on(SocketEvents.COMMENT_RESOLVED, onCommentResolved);
    socket.on(SocketEvents.COMMENT_UNRESOLVED, onCommentUnresolved);
    socket.on(SocketEvents.COMMENT_REACTION_ADDED, onCommentReactionAdded);
    socket.on(SocketEvents.COMMENT_REACTION_REMOVED, onCommentReactionRemoved);

    // Create cleanup function
    return () => {
      socket.off(SocketEvents.COMMENT_CREATED, onCommentCreated);
      socket.off(SocketEvents.COMMENT_UPDATED, onCommentUpdated);
      socket.off(SocketEvents.COMMENT_DELETED, onCommentDeleted);
      socket.off(SocketEvents.COMMENT_RESOLVED, onCommentResolved);
      socket.off(SocketEvents.COMMENT_UNRESOLVED, onCommentUnresolved);
      socket.off(SocketEvents.COMMENT_REACTION_ADDED, onCommentReactionAdded);
      socket.off(SocketEvents.COMMENT_REACTION_REMOVED, onCommentReactionRemoved);
    };
  }, [socket, editor, findComment, userInfo]);
}
