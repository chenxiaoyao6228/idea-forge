import { useRef, useEffect, useState, useCallback } from "react";
import { Transfer, OSSUploadPlugin, type TransferFile } from "@idea/file-transfer";
import { fileApi } from "@/apis/file";
import type { FileContextType } from "@idea/contracts";

export interface UseFileUploadOptions {
  context?: FileContextType;
}

export interface UseFileUploadResult {
  upload: (file: File) => Promise<{
    fileKey: string;
    fileId: string;
    downloadUrl: string;
  }>;
  uploading: boolean;
  progress: number;
  error: string | null;
  reset: () => void;
}

export const useFileUpload = (options: UseFileUploadOptions = {}): UseFileUploadResult => {
  const { context = "user" } = options;

  const transferRef = useRef<Transfer>();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const transfer = new Transfer();

    transfer.use(
      new OSSUploadPlugin({
        context,
        getCredentials: async (file: TransferFile) => {
          const response = await fileApi.getUploadCredentials({
            fileName: file.name,
            ext: file.name.split(".").pop()!,
            context,
          });
          // Map API response to expected format
          return {
            uploadUrl: response.credentials.url,
            fileKey: response.fileKey,
            fileId: response.fileId,
            downloadUrl: response.downloadUrl,
          };
        },
        confirmUpload: async (fileKey: string, fileId: string) => {
          await fileApi.confirmUpload({ fileKey, fileId });
        },
      }),
    );

    // Listen to progress
    transfer.emitter.on("progress", (file: TransferFile) => {
      setProgress(file.percent);
    });

    // Listen to status changes
    transfer.emitter.on("statusChange", (file: TransferFile) => {
      setUploading(file.status === "uploading");
    });

    // Listen to errors
    transfer.emitter.on("error", (_file: TransferFile, err: Error) => {
      setError(err.message || "Upload failed");
      setUploading(false);
    });

    // Listen to completion
    transfer.emitter.on("complete", () => {
      setUploading(false);
      setProgress(100);
    });

    transferRef.current = transfer;

    return () => {
      if (transferRef.current) {
        transferRef.current.emitter.removeAllListeners();
      }
    };
  }, [context]);

  const upload = useCallback(async (file: File) => {
    if (!transferRef.current) {
      throw new Error("Transfer not initialized");
    }

    setUploading(true);
    setError(null);
    setProgress(0);

    const fileId = transferRef.current.addFile(file);
    await transferRef.current.run(fileId);

    const uploadedFile = transferRef.current.getFile(fileId);
    if (!uploadedFile) {
      throw new Error("File not found after upload");
    }

    return {
      fileKey: uploadedFile.fileKey,
      fileId: uploadedFile.fileId,
      downloadUrl: uploadedFile.downloadUrl,
    };
  }, []);

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  return {
    upload,
    uploading,
    progress,
    error,
    reset,
  };
};
