import { useState, useEffect } from "react";
import { Transfer, ImportPlugin, type TransferFile } from "@idea/file-transfer";
import { importApi } from "@/apis/imports";
import { getFileInfo } from "@idea/utils";

export interface BatchSummary {
  all: number;
  progress: number;
  success: number;
  failed: number;
  cancelled: number;
}

// Singleton Transfer instance shared across all useBatchImport hook invocations
let transferInstance: Transfer | null = null;

const getTransferInstance = () => {
  if (!transferInstance) {
    const transfer = new Transfer();

    const plugin = new ImportPlugin({
      getCredentials: async (file) => {
        const fileInfo = await getFileInfo(file.data);

        const result = await importApi.prepare({
          fileName: file.name,
          mimeType: fileInfo.mimeType || file.data.type || "application/octet-stream",
          workspaceId: file.workspaceId,
          subspaceId: file.subspaceId,
          parentId: file.parentId ?? null,
          title: file.title,
        });

        return {
          uploadUrl: result.uploadUrl,
          fileKey: result.fileKey,
          fileId: result.importJobId,
          downloadUrl: "", // Not needed for imports
        };
      },
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
    transferInstance = transfer;
  }

  return transferInstance;
};

export const useBatchImport = () => {
  const [fileList, setFileList] = useState<TransferFile[]>([]);
  const [summary, setSummary] = useState<BatchSummary>({
    all: 0,
    progress: 0,
    success: 0,
    failed: 0,
    cancelled: 0,
  });

  useEffect(() => {
    const transfer = getTransferInstance();

    // Initialize fileList with existing files from Transfer instance
    const existingFiles = transfer.getFiles();
    if (existingFiles.length > 0) {
      setFileList(existingFiles);
    }

    // Event handlers
    const onStatusChange = (file: TransferFile) => {
      setFileList((prev) => prev.map((f) => (f.id === file.id ? { ...f, ...file } : f)));
    };

    const onProgress = (file: TransferFile) => {
      setFileList((prev) => prev.map((f) => (f.id === file.id ? { ...f, percent: file.percent } : f)));
    };

    const onAdded = (file: TransferFile) => {
      setFileList((prev) => [...prev, file]);
    };

    const onComplete = (file: TransferFile) => {
      setFileList((prev) => prev.map((f) => (f.id === file.id ? { ...f, status: "complete", percent: 100 } : f)));
    };

    const onError = (file: TransferFile) => {
      setFileList((prev) => prev.map((f) => (f.id === file.id ? { ...f, status: "failed" } : f)));
    };

    const onCancel = (file: TransferFile) => {
      setFileList((prev) => prev.map((f) => (f.id === file.id ? { ...f, status: "cancelled" } : f)));
    };

    // Register event listeners
    transfer.emitter.on("statusChange", onStatusChange);
    transfer.emitter.on("progress", onProgress);
    transfer.emitter.on("added", onAdded);
    transfer.emitter.on("complete", onComplete);
    transfer.emitter.on("error", onError);
    transfer.emitter.on("cancel", onCancel);

    // Cleanup: remove event listeners on unmount
    return () => {
      transfer.emitter.off("statusChange", onStatusChange);
      transfer.emitter.off("progress", onProgress);
      transfer.emitter.off("added", onAdded);
      transfer.emitter.off("complete", onComplete);
      transfer.emitter.off("error", onError);
      transfer.emitter.off("cancel", onCancel);
    };
  }, []);

  // Calculate summary whenever fileList changes
  useEffect(() => {
    const stats: BatchSummary = {
      all: 0,
      progress: 0,
      success: 0,
      failed: 0,
      cancelled: 0,
    };

    fileList.forEach((file) => {
      stats.all++;
      switch (file.status) {
        case "ready":
        case "uploading":
        case "processing":
          stats.progress++;
          break;
        case "complete":
          stats.success++;
          break;
        case "failed":
          stats.failed++;
          break;
        case "cancelled":
          stats.cancelled++;
          break;
      }
    });

    setSummary(stats);
  }, [fileList]);

  const importFiles = async (files: File[], workspaceId: string, subspaceId: string, parentId: string | undefined) => {
    const transfer = getTransferInstance();

    // Validate files
    const validExtensions = [".md", ".html", ".docx", ".csv", ".xlsx", ".xls", ".txt"];
    const invalidFiles: string[] = [];

    files.forEach((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !validExtensions.includes(`.${ext}`)) {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      throw new Error(`Invalid file types: ${invalidFiles.join(", ")}. Supported: ${validExtensions.join(", ")}`);
    }

    const fileIds = files.map((file) =>
      transfer.addFile({
        file,
        workspaceId,
        subspaceId,
        parentId,
        title: file.name.replace(/\.[^/.]+$/, ""),
      })
    );

    // Run all imports in parallel
    await transfer.run(fileIds);
  };

  const retryFailed = async () => {
    const transfer = getTransferInstance();
    const failedIds = fileList.filter((f) => f.status === "failed").map((f) => f.id);

    if (failedIds.length > 0) {
      // Reset status to ready for retry
      failedIds.forEach((id) => {
        const file = transfer.getFile(id);
        if (file) {
          file.status = "ready";
          file.percent = 0;
        }
      });

      // Update file list to reflect status change
      setFileList((prev) => prev.map((f) => (failedIds.includes(f.id) ? { ...f, status: "ready", percent: 0 } : f)));

      await transfer.run(failedIds);
    }
  };

  const cancelFile = (fileId: string) => {
    const transfer = getTransferInstance();
    transfer.cancelFile(fileId);
  };

  const clear = () => {
    // Clear local UI state only
    // Note: This doesn't remove files from the Transfer instance itself
    // as they might be referenced by other components
    setFileList([]);
    setSummary({
      all: 0,
      progress: 0,
      success: 0,
      failed: 0,
      cancelled: 0,
    });
  };

  return {
    importFiles,
    retryFailed,
    cancelFile,
    clear,
    fileList,
    summary,
  };
};
