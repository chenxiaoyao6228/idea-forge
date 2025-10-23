import { MoreHorizontal, Trash2, Link as LinkIcon } from "lucide-react";
import { Button } from "@idea/ui/shadcn/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@idea/ui/shadcn/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@idea/ui/shadcn/ui/alert-dialog";
import { useState } from "react";
import { toast } from "sonner";
import { useDeleteComment } from "@/stores/comment-store";
import { useCurrentUser } from "@/stores/user-store";
import type { CommentEntity } from "@/stores/comment-store";

interface CommentMenuProps {
  comment: CommentEntity;
}

export function CommentMenu({ comment }: CommentMenuProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const deleteComment = useDeleteComment();
  const currentUser = useCurrentUser();

  const canDelete = currentUser && currentUser.id === comment.createdById;

  if (!canDelete) return null;

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#comment-${comment.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const handleDelete = async () => {
    try {
      await deleteComment.run(comment.id);
      setShowDeleteDialog(false);
    } catch (error) {
      // Error handled by store
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={handleCopyLink}>
            <LinkIcon className="w-4 h-4 mr-2" />
            Copy link
          </DropdownMenuItem>
          {canDelete && (
            <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the comment{!comment.parentCommentId && " and all its replies"}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
