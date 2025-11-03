import { useState, useCallback, useRef, useEffect } from "react";
import { Transfer, ImportPlugin, type TransferFile } from "@idea/file-transfer";
import { importApi } from "@/apis/imports";
import { useNavigate } from "react-router-dom";
import { getFileInfo } from "@idea/utils";

interface ImportProgress {
  status: "pending" | "processing" | "uploading" | "downloading" | "converting" | "processing_images" | "creating_document" | "saving" | "complete" | "failed";
  progress: number;
  message: string;
}

interface UseDocumentImportResult {
  importDocument: (file: File, workspaceId: string, subspaceId: string, parentId: string | undefined, title: string) => Promise<void>;
  isImporting: boolean;
  progress: ImportProgress | null;
  error: string | null;
  reset: () => void;
  abort: () => void;
}

/**
 * Hook for importing documents using ImportPlugin
 * Handles file upload, import job queuing, and status polling via the plugin
 */
export const useDocumentImport = (): UseDocumentImportResult => {
  const navigate = useNavigate();
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const transferRef = useRef<Transfer | null>(null);
  const currentFileIdRef = useRef<string | null>(null);

  const abort = useCallback(() => {
    console.log("[useDocumentImport]: Aborting import");

    // Cancel any ongoing transfers
    if (transferRef.current && currentFileIdRef.current) {
      transferRef.current.cancelFile(currentFileIdRef.current);
    }

    // Stop polling and cleanup
    setIsImporting(false);
    setProgress(null);
    setError(null);
    currentFileIdRef.current = null;
  }, []);

  const reset = useCallback(() => {
    abort();
  }, [abort]);

  const importDocument = useCallback(
    async (file: File, workspaceId: string, subspaceId: string, parentId: string | undefined, title: string) => {
      console.log("[useDocumentImport]: Starting import", { file: file.name, workspaceId, subspaceId, parentId, title });

      // Validate file type
      const validExtensions = [".md", ".html", ".docx", ".csv", ".xlsx", ".xls", ".txt"];
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !validExtensions.includes(`.${ext}`)) {
        const errorMsg = `Unsupported file type: ${ext}. Supported types: ${validExtensions.join(", ")}`;
        setError(errorMsg);
        console.error("[useDocumentImport]:", errorMsg);
        return;
      }

      // Validate file size (10MB limit)
      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        const errorMsg = "File size exceeds 10MB limit";
        setError(errorMsg);
        console.error("[useDocumentImport]:", errorMsg);
        return;
      }

      setIsImporting(true);
      setError(null);
      setProgress({
        status: "uploading",
        progress: 0,
        message: "Preparing upload...",
      });

      try {
        // Get file information
        const fileInfo = await getFileInfo(file);

        // Prepare import - get presigned URL and credentials
        const { uploadUrl, fileKey, importJobId } = await importApi.prepare({
          fileName: file.name,
          mimeType: fileInfo.mimeType || file.type || "application/octet-stream",
          workspaceId,
          subspaceId,
          parentId: parentId ?? null,
          title,
        });

        // Create Transfer instance and register ImportPlugin
        const transfer = new Transfer();
        const plugin = new ImportPlugin({
          getCredentials: async () => ({
            uploadUrl,
            fileKey,
            fileId: importJobId,
            downloadUrl: "", // Not needed for imports
          }),
          confirmUpload: async () => {
            // No-op - confirmUpload is handled by ImportPlugin's startImport
          },
          startImport: async (data) => {
            return await importApi.start(data);
          },
          pollStatus: async (jobId) => {
            return await importApi.getStatus(jobId);
          },
          pollInterval: 1500, // 1.5 seconds
          pollTimeout: 120000, // 2 minutes
        });

        transfer.use(plugin);
        transferRef.current = transfer;

        // Listen to progress updates
        transfer.emitter.on("progress", (file: TransferFile) => {
          console.log("[useDocumentImport]: Progress update", { percent: file.percent, status: file.status });

          setProgress({
            status: file.status as any,
            progress: file.percent || 0,
            message: `${file.status}... ${file.percent}%`,
          });
        });

        // Listen to completion
        transfer.emitter.on("complete", (file: TransferFile) => {
          console.log("[useDocumentImport]: Import complete", { docId: file.docId, title: file.title });

          setIsImporting(false);
          setProgress({
            status: "complete",
            progress: 100,
            message: "Import complete!",
          });

          // Navigate to the newly created document
          if (file.docId) {
            setTimeout(() => {
              navigate(`/${file.docId}`);
            }, 500);
          }
        });

        // Listen to errors
        transfer.emitter.on("error", (file: TransferFile, err: Error) => {
          console.error("[useDocumentImport]: Import failed:", err);

          setIsImporting(false);
          setError(err.message || "Import failed");
          setProgress({
            status: "failed",
            progress: file.percent || 0,
            message: err.message || "Import failed",
          });
        });

        // Add file and start transfer
        const fileId = transfer.addFile(file);
        currentFileIdRef.current = fileId;

        console.log("[useDocumentImport]: Starting transfer", { fileId, importJobId });

        // Start the transfer
        await transfer.run(fileId);
      } catch (err: any) {
        console.error("[useDocumentImport]: Failed to start import:", err);
        setIsImporting(false);
        setError(err.message || "Failed to start import");
      }
    },
    [navigate],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transferRef.current && currentFileIdRef.current) {
        transferRef.current.cancelFile(currentFileIdRef.current);
      }
    };
  }, []);

  return {
    importDocument,
    isImporting,
    progress,
    error,
    reset,
    abort,
  };
};
