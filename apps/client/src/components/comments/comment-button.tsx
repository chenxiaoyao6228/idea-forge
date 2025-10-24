import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { Button } from "@idea/ui/shadcn/ui/button";
import type { Editor } from "@tiptap/react";
import { CommentsSidebar } from "./comments-sidebar";
import { useCommentSync } from "@/hooks/use-comment-sync";
import { useUnresolvedCommentCount } from "@/stores/comment-store";
import useUIStore from "@/stores/ui-store";

interface CommentButtonProps {
  documentId: string;
  editor?: Editor | null;
}

export function CommentButton({ documentId, editor }: CommentButtonProps) {
  const commentsSidebarOpen = useUIStore((state) => state.commentsSidebarOpen);
  const setCommentsSidebarOpen = useUIStore((state) => state.setCommentsSidebarOpen);
  const [focusedCommentId, setFocusedCommentId] = useState<string | null>(null);
  const unresolvedCount = useUnresolvedCommentCount(documentId);

  // Enable real-time sync
  useCommentSync({
    documentId,
    editor,
    onCommentFocus: (commentId) => {
      setFocusedCommentId(commentId);
      setCommentsSidebarOpen(true);
    },
  });

  return (
    <>
      {/* Comment button */}
      <Button variant={commentsSidebarOpen ? "secondary" : "ghost"} size="sm" onClick={() => setCommentsSidebarOpen(!commentsSidebarOpen)} className="relative">
        <MessageSquareText className="w-6 h-6" />
      </Button>

      {/* Comments sidebar */}
      <CommentsSidebar documentId={documentId} open={commentsSidebarOpen} />
    </>
  );
}
