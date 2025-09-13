import { useEffect, useState } from "react";
import { Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { documentApi } from "@/apis/document";
import { type TrashDocumentResponse } from "@idea/contracts";
import { ErrorCodeEnum } from "@api/_shared/constants/api-response-constant";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { confirmModal } from "../../../components/ui/confirm-modal";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import Loading from "../../../components/ui/loading";
import { confirmable, ContextAwareConfirmation, type ConfirmDialogProps } from "react-confirm";

interface TrashDialogProps {
  // react-confirm props
  show?: boolean;
  proceed?: (value: any) => void;
}

const TrashDialog: React.FC<ConfirmDialogProps<TrashDialogProps, any>> = ({ show = false, proceed }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<TrashDocumentResponse[]>([]);
  const [keyword, setKeyword] = useState("");

  // Load trash documents when dialog opens
  useEffect(() => {
    if (show) {
      loadTrashDocuments();
    }
  }, [show]);

  async function loadTrashDocuments() {
    try {
      setLoading(true);
      const docs = await documentApi.getTrash();
      setDocuments(docs);
    } catch (error) {
      toast.error(t("Failed to load trash documents"));
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(id: string) {
    try {
      await documentApi.restore(id);
      await loadTrashDocuments();
      // Refresh both document lists
      await Promise.all([
        // FIXME: remove add this after the share feature added
        // loadSharedDocuments(),
        // loadNestedTree(null),
      ]);
      toast.success(t("Document restored successfully"));
    } catch (error) {
      toast.error(t("Failed to restore document"));
    }
  }

  async function handlePermanentDelete(id: string) {
    confirmModal({
      type: "alert",
      confirmVariant: "destructive",
      title: t("Permanent Delete"),
      description: t("Are you sure you want to permanently delete this document? This action cannot be undone."),
      confirmText: t("Delete"),
      cancelText: t("Cancel"),
      onConfirm: async () => {
        try {
          await documentApi.permanentDelete(id);
          await loadTrashDocuments();
          toast.success(t("Document deleted permanently"));
          return true;
        } catch (error: any) {
          if (error?.code === ErrorCodeEnum.DocumentNotFound) {
            // refresh trash documents
            toast.error(t("Document not found in trash"));
            await loadTrashDocuments();
            return false;
          }
          toast.error(t("Failed to delete document"));
          return false;
        }
      },
    });
  }

  const filteredDocuments = documents.filter((doc) => doc.title.toLowerCase().includes(keyword.toLowerCase()));

  const handleClose = () => {
    proceed?.(null);
  };

  return (
    <Dialog open={show} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{t("Trash")}</DialogTitle>
          <DialogDescription>{t("Documents in trash will be automatically deleted after 30 days. You can restore them before then.")}</DialogDescription>
        </DialogHeader>
        <>
          <div>
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={t("Search documents in trash")} className="max-w" />
          </div>

          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {loading ? (
              <Loading />
            ) : documents.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">{t("No documents in trash")}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">{t("Title")}</TableHead>
                    <TableHead>{t("Deleted At")}</TableHead>
                    <TableHead className="text-right">{t("Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.title || t("Untitled")}</TableCell>
                      <TableCell>{formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleRestore(doc.id)}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handlePermanentDelete(doc.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </>
      </DialogContent>
    </Dialog>
  );
};

// Create the confirm modal
export const trashModal = ContextAwareConfirmation.createConfirmation(confirmable(TrashDialog));

// Helper function to show the trash modal
export const showTrashModal = () => {
  return trashModal({});
};
