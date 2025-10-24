import { useState } from "react";
import { Button } from "@idea/ui/shadcn/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@idea/ui/shadcn/ui/avatar";
import { MoreHorizontal, Check, X } from "lucide-react";
import { cn } from "@idea/ui/shadcn/utils";
import { CommentEditor } from "./comment-editor";
import { CommentMenu } from "./comment-menu";
import { useUpdateComment, useResolveComment, useUnresolveComment } from "@/stores/comment-store";
import { useCurrentUser } from "@/stores/user-store";
import type { CommentEntity } from "@/stores/comment-store";
import { useEditorStore } from "@/stores/editor-store";

interface CommentThreadItemProps {
  comment: CommentEntity;
  highlightedText?: string;
  firstOfThread?: boolean;
  firstOfAuthor?: boolean;
  canReply?: boolean;
}

export function CommentThreadItem({ comment, highlightedText, firstOfThread = false, firstOfAuthor = true }: CommentThreadItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(comment.data);
  const currentUser = useCurrentUser();
  const editor = useEditorStore((state) => state.editor);

  const updateComment = useUpdateComment();
  const resolveComment = useResolveComment();
  const unresolveComment = useUnresolveComment();

  const isResolved = !!comment.resolvedAt;
  const canEdit = !isResolved && comment.createdById === currentUser?.id;
  const canResolve = firstOfThread && !comment.parentCommentId;

  const handleSave = async () => {
    await updateComment.run({ id: comment.id, data: editData });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData(comment.data);
  };

  const handleResolve = async () => {
    if (!currentUser) return;

    if (isResolved) {
      await unresolveComment.run(comment.id);
    } else {
      await resolveComment.run(comment.id, currentUser.id);
    }
  };

  const handleScrollToComment = () => {
    if (!editor) return;

    // Find the comment mark in the document
    const { doc } = editor.state;
    let markPos: { from: number; to: number } | null = null;

    doc.nodesBetween(0, doc.content.size, (node, pos) => {
      if (markPos) return false; // Already found

      node.marks.forEach((mark) => {
        if (mark.type.name === "commentMark" && mark.attrs.id === comment.id) {
          markPos = { from: pos, to: pos + node.nodeSize };
        }
      });
    });

    if (!markPos) return;

    const { from, to } = markPos;

    // Use ProseMirror's coordsAtPos to get the DOM coordinates
    const coords = editor.view.coordsAtPos(from);

    // Scroll to the position
    window.scrollTo({
      top: coords.top - 100, // Offset 100px from top for better visibility
      behavior: "smooth",
    });

    // Set selection to the comment mark (this also provides visual feedback)
    editor.chain().focus().setTextSelection({ from, to }).run();

    // Temporarily add highlight mark
    const tr = editor.view.state.tr;
    const highlightMark = editor.schema.marks.highlight.create();
    editor.view.dispatch(tr.addMark(from, to, highlightMark));

    // Remove highlight after 2 seconds
    setTimeout(() => {
      const removeTr = editor.view.state.tr.removeMark(from, to, editor.schema.marks.highlight);
      editor.view.dispatch(removeTr);
    }, 2000);
  };

  // Get initials for avatar fallback
  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn("flex gap-3", !firstOfAuthor && "ml-12")}>
      {firstOfAuthor && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={comment.createdBy?.imageUrl ?? undefined} alt={comment.createdBy?.displayName ?? undefined} />
          <AvatarFallback>{getInitials(comment.createdBy?.displayName ?? undefined)}</AvatarFallback>
        </Avatar>
      )}

      <div className="flex-1 min-w-0 group">
        <div className={cn("rounded-lg p-3 bg-muted", isResolved && "opacity-60")}>
          {firstOfAuthor && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <span className="font-medium truncate">{comment.createdBy?.displayName || comment.createdBy?.email}</span>
              <span>·</span>
              <span className="text-xs">{new Date(comment.createdAt).toLocaleDateString()}</span>
            </div>
          )}

          {highlightedText && (
            <div
              className="bg-yellow-100 dark:bg-yellow-900/20 p-2 rounded mb-2 text-sm italic cursor-pointer hover:bg-yellow-200 dark:hover:bg-yellow-900/30 transition-colors"
              onClick={handleScrollToComment}
              title="Click to scroll to this text in the document"
            >
              "{highlightedText}"
            </div>
          )}

          {isEditing ? (
            <>
              <CommentEditor value={editData} onChange={setEditData} autoFocus onSubmit={handleSave} />
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={handleSave} disabled={updateComment.loading}>
                  <Check className="w-4 h-4 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <CommentEditor value={comment.data} readOnly />
          )}
        </div>

        {!isEditing && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 mt-1">
            {canResolve && (
              <Button size="sm" variant="ghost" onClick={handleResolve}>
                {isResolved ? "Unresolve" : "Resolve"}
              </Button>
            )}

            {canEdit && (
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}

            <CommentMenu comment={comment} />
          </div>
        )}
      </div>
    </div>
  );
}
