import { Button } from "@idea/ui/shadcn/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@idea/ui/shadcn/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Archive } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useArchiveDocument, useDeleteDocument } from "@/stores/document-store";
import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { showConfirmModal } from "@/components/ui/confirm-modal";

interface DocumentMenuProps {
  documentId: string;
  documentTitle: string;
  onRename?: () => void;
}

export function DocumentMenu({ documentId, documentTitle, onRename }: DocumentMenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { docId: currentDocId } = useParams();
  const { run: archiveDocument, loading: isArchiving } = useArchiveDocument();
  const { run: deleteDocument, loading: isDeleting } = useDeleteDocument();
  const [isOpen, setIsOpen] = useState(false);

  const isCurrentDocument = currentDocId === documentId;

  const handleRename = () => {
    setIsOpen(false);
    onRename?.();
  };

  const handleArchive = async () => {
    setIsOpen(false);

    const confirmed = await showConfirmModal({
      title: t("Archive Document"),
      description: t('Are you sure you want to archive "{{title}}"?\n\nArchived documents can be found in the trash.', { title: documentTitle }),
      confirmText: t("Archive"),
      cancelText: t("Cancel"),
      confirmVariant: "default",
      type: "alert",
    });

    if (!confirmed) {
      return;
    }

    try {
      // Navigate away first if this is the current document
      if (isCurrentDocument) {
        navigate("/");
      }

      await archiveDocument(documentId);
    } catch (error) {
      console.error("Failed to archive document:", error);
    }
  };

  const handleDelete = async () => {
    setIsOpen(false);

    const confirmed = await showConfirmModal({
      title: t("Delete Document"),
      description: t('Are you sure you want to delete "{{title}}"?\n\nThis document will be moved to trash and can be restored later.', { title: documentTitle }),
      confirmText: t("Delete"),
      cancelText: t("Cancel"),
      confirmVariant: "destructive",
      type: "alert",
    });

    if (!confirmed) {
      return;
    }

    try {
      // Navigate away first if this is the current document
      if (isCurrentDocument) {
        navigate("/");
      }

      await deleteDocument(documentId, { permanent: false });
    } catch (error) {
      console.error("Failed to delete document:", error);
    }
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild onClick={handleTriggerClick}>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <MoreHorizontal className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={handleRename}>
          <Edit className="mr-2 h-4 w-4" />
          {t("Rename")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleArchive} disabled={isArchiving}>
          <Archive className="mr-2 h-4 w-4" />
          {isArchiving ? t("Archiving...") : t("Archive")}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleDelete} disabled={isDeleting} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          {isDeleting ? t("Deleting...") : t("Delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
