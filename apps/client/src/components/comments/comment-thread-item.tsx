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

interface CommentThreadItemProps {
  comment: CommentEntity;
  highlightedText?: string;
  firstOfThread?: boolean;
  firstOfAuthor?: boolean;
  canReply?: boolean;
}

export function CommentThreadItem({ comment, highlightedText, firstOfThread = false, firstOfAuthor = true, canReply = false }: CommentThreadItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(comment.data);
  const currentUser = useCurrentUser();

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

          {highlightedText && <div className="bg-yellow-100 dark:bg-yellow-900/20 p-2 rounded mb-2 text-sm italic">"{highlightedText}"</div>}

          {isEditing ? (
            <>
              <CommentEditor value={editData} onChange={setEditData} autoFocus />
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
