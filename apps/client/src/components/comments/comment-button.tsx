import { MessageSquareText } from "lucide-react";
import { Button } from "@idea/ui/shadcn/ui/button";
import type { Editor } from "@tiptap/react";
import { CommentsSidebar } from "./comments-sidebar";
import useUIStore from "@/stores/ui-store";
import { TooltipWrapper } from "../tooltip-wrapper";
import { useTranslation } from "react-i18next";

interface CommentButtonProps {
  documentId: string;
  editor?: Editor | null;
}

export function CommentButton({ documentId, editor }: CommentButtonProps) {
  const { t } = useTranslation();
  const commentsSidebarOpen = useUIStore((state) => state.commentsSidebarOpen);
  const setCommentsSidebarOpen = useUIStore((state) => state.setCommentsSidebarOpen);

  return (
    <>
      {/* Comment button */}
      <TooltipWrapper disabled={commentsSidebarOpen} tooltip={t("Comments")}>
        <Button
          variant={commentsSidebarOpen ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setCommentsSidebarOpen(!commentsSidebarOpen)}
          className="relative"
        >
          <MessageSquareText className="w-6 h-6" />
        </Button>
      </TooltipWrapper>

      {/* Comments sidebar */}
      <CommentsSidebar documentId={documentId} open={commentsSidebarOpen} />
    </>
  );
}
