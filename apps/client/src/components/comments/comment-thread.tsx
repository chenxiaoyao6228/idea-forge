import { useState } from "react";
import { Button } from "@idea/ui/shadcn/ui/button";
import { cn } from "@idea/ui/shadcn/utils";
import { CommentThreadItem } from "./comment-thread-item";
import { CommentForm } from "./comment-form";
import { useCommentsInThread } from "@/stores/comment-store";
import type { CommentEntity } from "@/stores/comment-store";
import { useEditorStore } from "@/stores/editor-store";
import { getAnchorTextForComment } from "@/editor/utils/comment-helpers";

interface CommentThreadProps {
  comment: CommentEntity;
  focused: boolean;
  recessed: boolean;
  onFocus: () => void;
}

export function CommentThread({ comment, focused, recessed, onFocus }: CommentThreadProps) {
  const [expanded, setExpanded] = useState(false);
  const threadComments = useCommentsInThread(comment.id);
  const editor = useEditorStore((state) => state.editor);

  const [parent, ...replies] = threadComments;
  const visibleCount = expanded ? replies.length : Math.min(replies.length, 3);
  const hiddenCount = replies.length - visibleCount;
  const canReply = !parent?.resolvedAt;

  // Compute anchor text on-demand from the editor document (Outline's approach)
  const highlightedText = parent ? getAnchorTextForComment(editor, parent.id) : undefined;

  if (!parent) return null;

  return (
    <div
      className={cn("transition-opacity rounded-lg", recessed && "opacity-50", focused && "ring-2 ring-primary p-2")}
      onClick={onFocus}
      data-comment-thread-id={comment.id}
    >
      <CommentThreadItem comment={parent} highlightedText={highlightedText} firstOfThread canReply={canReply} />

      {replies.slice(0, visibleCount).map((reply, index) => {
        const prevReply = index > 0 ? replies[index - 1] : parent;
        const firstOfAuthor = reply.createdById !== prevReply.createdById;

        return <CommentThreadItem key={reply.id} comment={reply} firstOfAuthor={firstOfAuthor} />;
      })}

      {hiddenCount > 0 && (
        <Button variant="ghost" size="sm" className="ml-12 mt-2" onClick={() => setExpanded(true)}>
          {hiddenCount} more {hiddenCount === 1 ? "reply" : "replies"}
        </Button>
      )}

      {canReply && (
        <div className="ml-12 mt-2 px-1">
          <CommentForm
            documentId={parent.documentId}
            parentCommentId={parent.id}
            placeholder="Reply..."
            draftKey={`draft-${parent.documentId}-${parent.id}`}
            compact
          />
        </div>
      )}
    </div>
  );
}
