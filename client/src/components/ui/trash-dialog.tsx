import { useEffect, useState } from "react";
import { Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { documentApi } from "@/apis/document";
import type { TrashDocumentResponse } from "shared";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useSharedDocumentStore } from "@/pages/doc/stores/shared-store";
import { useDocumentStore } from "@/pages/doc/stores/doc-store";
import { confirmModal } from "./confirm-modal";
import { cn } from "@/lib/utils";

export function TrashDialog() {
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
        title: "Error",
        description: "Failed to load trash documents",
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
        description: "Document restored successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to restore document",
      });
    }
  }

  async function handlePermanentDelete(id: string) {
    confirmModal({
      type: "alert",
      confirmVariant: "destructive",
      title: "Permanent Delete",
      description: "Are you sure you want to permanently delete this document? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          await documentApi.permanentDelete(id);
          await loadTrashDocuments();
          toast({ description: "Document deleted permanently" });
          return true;
        } catch (error) {
          toast({ variant: "destructive", description: "Failed to delete document" });
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
          <span className="truncate">Trash</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Trash</DialogTitle>
          <DialogDescription>Docs in trash will be deleted permanently after 30 days.</DialogDescription>
        </DialogHeader>
        <>
          <div>
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Search documents in trash" className="max-w" />
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : documents.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No documents in trash</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Title</TableHead>
                    <TableHead>Deleted At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.title || "Untitled"}</TableCell>
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
