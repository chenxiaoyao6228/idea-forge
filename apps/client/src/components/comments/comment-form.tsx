import { useState, useEffect, useRef } from "react";
import { Button } from "@idea/ui/shadcn/ui/button";
import { Send } from "lucide-react";
import { CommentEditor } from "./comment-editor";
import { useCreateComment } from "@/stores/comment-store";
import { cn } from "@idea/ui/shadcn/utils";
import useUIStore from "@/stores/ui-store";
import { useEditorStore } from "@/stores/editor-store";

interface CommentFormProps {
  documentId: string;
  parentCommentId?: string;
  placeholder?: string;
  draftKey: string;
  compact?: boolean;
  onSubmitSuccess?: () => void;
}

export function CommentForm({ documentId, parentCommentId, placeholder = "Add a comment...", draftKey, compact = false, onSubmitSuccess }: CommentFormProps) {
  const [content, setContent] = useState<any>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [autoFocus, setAutoFocus] = useState(false);
  const createComment = useCreateComment();
  const pendingDraftCommentId = useUIStore((state) => state.pendingDraftCommentId);
  const setPendingDraftComment = useUIStore((state) => state.setPendingDraftComment);
  const editor = useEditorStore((state) => state.editor);
  const draftIdRef = useRef<string | undefined>(undefined);

  // Load draft from localStorage
  useEffect(() => {
    try {
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        setContent(JSON.parse(draft));
      }
    } catch (error) {
      console.error("Failed to load draft:", error);
    }
  }, [draftKey]);

  // Save draft to localStorage
  useEffect(() => {
    if (content) {
      try {
        localStorage.setItem(draftKey, JSON.stringify(content));
      } catch (error) {
        console.error("Failed to save draft:", error);
      }
    }
  }, [content, draftKey]);

  // Handle draft comment from text selection
  useEffect(() => {
    if (pendingDraftCommentId && !parentCommentId) {
      // Only handle draft for top-level comments (not replies)
      draftIdRef.current = pendingDraftCommentId;
      setAutoFocus(true);
      setIsFocused(true);
    }
  }, [pendingDraftCommentId, parentCommentId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // If there's a pending draft that wasn't saved, remove the mark
      if (draftIdRef.current && editor) {
        editor.chain().focus().unsetCommentMark(draftIdRef.current).run();
      }
    };
  }, [editor]);

  const isEmpty = !content || (content.content && content.content.length === 0) || content.content?.[0]?.content?.length === 0;

  const handleSubmit = async () => {
    if (isEmpty) return;

    const commentDraftId = draftIdRef.current;

    try {
      const comment = await createComment.run({
        id: commentDraftId, // Pass draft ID if present
        documentId,
        parentCommentId,
        data: content,
      });

      // If this was a draft comment, update the mark with the real ID
      if (commentDraftId && editor && comment) {
        editor
          .chain()
          .focus()
          .updateCommentMark(commentDraftId, {
            draft: false,
          })
          .run();

        // Also need to update the ID attribute
        // First unset the old mark, then set a new one with the real ID
        // Get the text range for the old mark by finding it in the document
        const { doc } = editor.state;
        let markRange: { from: number; to: number } | null = null;

        doc.nodesBetween(0, doc.content.size, (node, pos) => {
          node.marks.forEach((mark) => {
            if (mark.type.name === "commentMark" && mark.attrs.id === commentDraftId) {
              markRange = { from: pos, to: pos + node.nodeSize };
            }
          });
        });

        if (markRange) {
          editor
            .chain()
            .focus()
            .setTextSelection(markRange)
            .unsetCommentMark(commentDraftId)
            .setCommentMark({
              id: comment.id,
              userId: comment.createdById,
              draft: false,
              resolved: false,
            })
            .run();
        }
      }

      // Clear form and draft
      setContent(null);
      localStorage.removeItem(draftKey);
      setIsFocused(false);
      setAutoFocus(false);

      // Clear the draft ID from store and ref
      if (commentDraftId) {
        setPendingDraftComment(undefined);
        draftIdRef.current = undefined;
      }

      onSubmitSuccess?.();
    } catch (error) {
      // Error handled by store
    }
  };

  return (
    <div className={cn("space-y-2", compact && "scale-95")}>
      <div className={cn("border rounded-lg transition-colors", isFocused && "ring-2 ring-primary")}>
        <CommentEditor
          value={content}
          onChange={setContent}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onSubmit={handleSubmit}
        />
      </div>

      {isFocused && (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            disabled={isEmpty || createComment.loading}
          >
            <Send className="w-4 h-4 mr-1" />
            {parentCommentId ? "Reply" : "Comment"}
          </Button>
        </div>
      )}
    </div>
  );
}
