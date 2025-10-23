import { useState, useEffect } from "react";
import { Button } from "@idea/ui/shadcn/ui/button";
import { Send } from "lucide-react";
import { CommentEditor } from "./comment-editor";
import { useCreateComment } from "@/stores/comment-store";
import { cn } from "@idea/ui/shadcn/utils";

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
  const createComment = useCreateComment();

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

  const isEmpty = !content || (content.content && content.content.length === 0) || content.content?.[0]?.content?.length === 0;

  const handleSubmit = async () => {
    if (isEmpty) return;

    try {
      await createComment.run({
        documentId,
        parentCommentId,
        data: content,
      });

      // Clear form and draft
      setContent(null);
      localStorage.removeItem(draftKey);
      setIsFocused(false);

      onSubmitSuccess?.();
    } catch (error) {
      // Error handled by store
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd+Enter or Ctrl+Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn("space-y-2", compact && "scale-95")}>
      <div className={cn("border rounded-lg transition-colors", isFocused && "ring-2 ring-primary")} onKeyDown={handleKeyDown}>
        <CommentEditor value={content} onChange={setContent} placeholder={placeholder} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} />
      </div>

      {isFocused && (
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={handleSubmit} disabled={isEmpty || createComment.loading}>
            <Send className="w-4 h-4 mr-1" />
            {parentCommentId ? "Reply" : "Comment"}
          </Button>
        </div>
      )}
    </div>
  );
}
