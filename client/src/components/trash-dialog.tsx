import { useEffect, useState } from "react";
import { Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { documentApi } from "@/apis/document";
import { ErrorCodeEnum, type TrashDocumentResponse } from "shared";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useSharedDocumentStore } from "@/pages/doc/stores/shared-store";
import { useDocumentStore } from "@/pages/doc/stores/doc-store";
import { confirmModal } from "./ui/confirm-modal";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function TrashDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<TrashDocumentResponse[]>([]);
  const [keyword, setKeyword] = useState("");
  const { toast } = useToast();
  const loadSharedDocuments = useSharedDocumentStore((state) => state.loadSharedDocuments);
  const loadNestedTree = useDocumentStore((state) => state.loadNestedTree);

  // Load trash documents when dialog opens
  useEffect(() => {
    if (open) {
      loadTrashDocuments();
    }
  }, [open]);

  async function loadTrashDocuments() {
    try {
      setLoading(true);
      const docs = await documentApi.getTrash();
      setDocuments(docs);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("Error"),
        description: t("Failed to load trash documents"),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(id: string) {
    try {
      await documentApi.restore(id);
      await loadTrashDocuments();
      // Refresh both document lists
      await Promise.all([loadSharedDocuments(), loadNestedTree(null)]);
      toast({
        description: t("Document restored successfully"),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("Error"),
        description: t("Failed to restore document"),
      });
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
          toast({ description: t("Document deleted permanently") });
          return true;
        } catch (error: any) {
          if (error?.code === ErrorCodeEnum.DocumentNotFound) {
            // refresh trash documents
            toast({ description: t("Document not found in trash") });
            await loadTrashDocuments();
            return false;
          }
          toast({ variant: "destructive", description: t("Failed to delete document") });
          return false;
        }
      },
    });
  }

  const filteredDocuments = documents.filter((doc) => doc.title.toLowerCase().includes(keyword.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            "group/tree-node relative flex w-full items-center py-1 px-2",
            "rounded-lg transition-colors",
            "hover:bg-accent/50 dark:hover:bg-accent/25",
            "text-sm font-normal",
          )}
        >
          <Trash2 className="h-4 w-4 mr-2 shrink-0" />
          <span className="truncate">{t("Trash")}</span>
        </button>
      </DialogTrigger>
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
              <div className="py-8 text-center text-muted-foreground">{t("Loading...")}</div>
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
}
