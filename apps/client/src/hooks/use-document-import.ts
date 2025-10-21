import { useState, useCallback, useRef, useEffect } from "react";
import { uploadDocumentForImport } from "@/lib/upload-document";
import { importApi } from "@/apis/imports";
import type { ImportStatusResponse } from "@idea/contracts";
import { useNavigate } from "react-router-dom";

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
}

const POLLING_INTERVAL = 1500; // Poll every 1.5 seconds
const POLLING_TIMEOUT = 120000; // 2 minutes timeout

/**
 * Hook for importing documents with polling-based progress tracking
 * Handles file upload, import job queuing, and status polling
 */
export const useDocumentImport = (): UseDocumentImportResult => {
  const navigate = useNavigate();
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const importJobIdRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const reset = useCallback(() => {
    setIsImporting(false);
    setProgress(null);
    setError(null);
    importJobIdRef.current = null;

    // Clear intervals and timeouts
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Polling function to check import status
  const pollImportStatus = useCallback(async () => {
    const importJobId = importJobIdRef.current;
    if (!importJobId) return;

    try {
      console.log("[useDocumentImport]: Polling status for", importJobId);
      const status: ImportStatusResponse = await importApi.getStatus(importJobId);

      console.log("[useDocumentImport]: Received status", status);

      // Update progress
      setProgress({
        status: status.status,
        progress: status.progress,
        message: status.message,
      });

      // Handle completion
      if (status.status === "complete") {
        setIsImporting(false);

        // Clear polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        console.log("[useDocumentImport]: Import complete", { docId: status.docId });

        // Navigate to the newly created document
        if (status.docId) {
          setTimeout(() => {
            navigate(`/${status.docId}`);
          }, 500);
        }
      }

      // Handle failure
      if (status.status === "failed") {
        setIsImporting(false);
        setError(status.error || "Import failed");

        // Clear polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        console.error("[useDocumentImport]: Import failed:", status.error);
      }
    } catch (err: any) {
      console.error("[useDocumentImport]: Failed to poll status:", err);
      // Don't stop polling on network errors, keep trying
    }
  }, []);

  const importDocument = useCallback(
    async (file: File, workspaceId: string, subspaceId: string, parentId: string | undefined, title: string) => {
      console.log("[useDocumentImport]: Starting import", { file: file.name, workspaceId, subspaceId, parentId, title });

      setIsImporting(true);
      setError(null);
      setProgress({
        status: "uploading",
        progress: 0,
        message: "Preparing upload...",
      });

      try {
        // Upload and start import
        const result = await uploadDocumentForImport({
          file,
          workspaceId,
          subspaceId,
          parentId,
          title,
        });

        // Store import job ID for polling
        importJobIdRef.current = result.importJobId;

        console.log("[useDocumentImport]: Import job started", {
          importJobId: result.importJobId,
          jobId: result.jobId,
        });

        setProgress({
          status: "processing",
          progress: 10,
          message: "File uploaded, starting import...",
        });

        // Start polling for status updates
        pollingIntervalRef.current = setInterval(pollImportStatus, POLLING_INTERVAL);

        // Set a timeout to detect stuck imports
        timeoutRef.current = setTimeout(() => {
          if (importJobIdRef.current === result.importJobId) {
            console.error("[useDocumentImport]: Import timeout - job stuck for 2 minutes", {
              importJobId: result.importJobId,
              currentProgress: progress,
            });

            // Clear polling
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }

            setError("Import is taking longer than expected. The document may have been created. Please check your documents list.");
            setIsImporting(false);
          }
        }, POLLING_TIMEOUT);
      } catch (err: any) {
        setIsImporting(false);
        setError(err.message || "Failed to start import");
        console.error("[useDocumentImport]: Import failed:", err);
      }
    },
    [pollImportStatus, progress],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    importDocument,
    isImporting,
    progress,
    error,
    reset,
  };
};
