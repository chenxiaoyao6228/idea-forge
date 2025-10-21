import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@idea/ui/shadcn/ui/dialog";
import { Upload, FileText, Table, FileCode, FileType, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { confirmable, ContextAwareConfirmation, type ConfirmDialogProps } from "react-confirm";
import { Button } from "@idea/ui/shadcn/ui/button";
import { useDocumentImport } from "@/hooks/use-document-import";
import { cn } from "@idea/ui/shadcn/utils";
import { fileOpen } from "@/lib/filesystem";
import { useCurrentWorkspace } from "@/stores/workspace-store";
import { useCurrentDocumentFromStore } from "@/stores/document-store";

interface ImportFilesDialogProps {
  show?: boolean;
  proceed?: (value: any) => void;
}

// Import configuration
const importConfig = {
  markdown: {
    icon: FileText,
    title: "Markdown",
    description: "Support .md files",
    extensions: ["md"],
  },
  csv: {
    icon: Table,
    title: "CSV",
    description: "Support .csv files",
    extensions: ["csv"],
  },
  html: {
    icon: FileCode,
    title: "HTML",
    description: "Support .html files",
    extensions: ["html"],
  },
  word: {
    icon: FileType,
    title: "Word",
    description: "Support .docx files",
    extensions: ["docx"],
  },
} as const;

const ImportFilesDialog: React.FC<ConfirmDialogProps<ImportFilesDialogProps, any>> = ({ show = false, proceed }) => {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<keyof typeof importConfig | null>(null);
  const { importDocument, isImporting, progress, error, reset } = useDocumentImport();

  // Get workspace and subspace context from hooks
  const currentWorkspace = useCurrentWorkspace();
  const currentDocument = useCurrentDocumentFromStore();
  const workspaceId = currentWorkspace?.id;
  const subspaceId = currentDocument?.subspaceId ?? undefined;
  // Import as child of current document (use current document's id as parentId)
  const parentId = currentDocument?.id ?? undefined;

  const handleClose = () => {
    reset();
    setSelectedType(null);
    proceed?.(null);
  };

  const handleTypeSelect = async (type: keyof typeof importConfig) => {
    if (!workspaceId || !subspaceId) return;

    setSelectedType(type);
    const config = importConfig[type];

    try {
      // Use fileOpen utility to pick file with proper type filtering
      const file = await fileOpen({
        extensions: config.extensions as any, // Type assertion needed for readonly arrays
        description: `Import ${config.title}`,
      });

      if (!file) return;

      // Use file name without extension as title
      const documentTitle = file.name.replace(/\.[^/.]+$/, "");

      await importDocument(file, workspaceId, subspaceId, parentId, documentTitle);
      // close the dialog
      proceed?.(null);
    } catch (err: any) {
      // User cancelled file picker or error occurred
      console.log("File selection cancelled or failed:", err);
      setSelectedType(null);
    }
  };

  if (!workspaceId || !subspaceId) {
    return (
      <Dialog open={show} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t("Import Files")}
            </DialogTitle>
            <DialogDescription>
              {!workspaceId && t("Please select a workspace first")}
              {workspaceId && !subspaceId && t("Please open a document or subspace to import files")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {t("To import files, navigate to any document first. The imported file will be placed in the same subspace.")}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={show} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t("Import Files")}
          </DialogTitle>
          <DialogDescription>{isImporting ? t("Importing your document...") : t("Choose a file type to import")}</DialogDescription>
        </DialogHeader>

        {/* Import Progress */}
        {isImporting && progress && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{progress.message}</span>
                <span className="font-medium">{progress.progress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div className="bg-primary h-full transition-all duration-300 ease-out" style={{ width: `${progress.progress}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                {t("Status")}: {progress.status}
              </span>
            </div>
          </div>
        )}

        {/* Success Message */}
        {!isImporting && progress?.status === "complete" && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>{t("Import completed successfully!")}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {/* File Type Selection */}
        {!isImporting && !progress && (
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(importConfig).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <Button
                  key={key}
                  variant="outline"
                  className={cn("h-auto flex-col items-start p-4 hover:bg-accent", selectedType === key && "border-primary")}
                  onClick={() => handleTypeSelect(key as keyof typeof importConfig)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{t(config.title)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{t(config.description)}</span>
                </Button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const importFilesModal = ContextAwareConfirmation.createConfirmation(confirmable(ImportFilesDialog));

export const showImportFilesModal = () => {
  return importFilesModal({});
};
