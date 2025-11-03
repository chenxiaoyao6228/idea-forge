import type { Editor } from "@tiptap/react";
import { Button } from "@idea/ui/shadcn/ui/button";
import { MessageSquare } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import useUIStore from "@/stores/ui-store";
import { useCurrentDocumentId } from "@/stores/document-store";
import useUserStore from "@/stores/user-store";

interface IProps {
  editor: Editor | null;
}

export default function CommentMenu(props: IProps) {
  const { editor } = props;
  const documentId = useCurrentDocumentId();
  const userInfo = useUserStore((state) => state.userInfo);
  const setCommentsSidebarOpen = useUIStore((state) => state.setCommentsSidebarOpen);
  const setPendingDraftComment = useUIStore((state) => state.setPendingDraftComment);
  const pendingDraftCommentId = useUIStore((state) => state.pendingDraftCommentId);

  if (editor == null) return null;

  const handleAddComment = () => {
    if (!editor || !documentId || !userInfo) return;

    // If there's already a pending draft comment, remove its mark first
    if (pendingDraftCommentId) {
      editor.chain().focus().unsetCommentMark(pendingDraftCommentId).run();
    }

    // Generate new draft comment ID
    const draftId = uuidv4();

    // Apply draft comment mark to selection
    editor
      .chain()
      .focus()
      .setCommentMark({
        id: draftId,
        userId: userInfo.id,
        draft: true,
        resolved: false,
      })
      .run();

    // Set pending draft ID so the comment form knows to use it
    setPendingDraftComment(draftId);

    // Open sidebar
    setCommentsSidebarOpen(true);
  };

  return (
    <Button size="sm" onClick={handleAddComment} variant="ghost" tabIndex={-1}>
      <MessageSquare className="h-4 w-4" />
    </Button>
  );
}
