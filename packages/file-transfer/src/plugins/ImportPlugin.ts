import { OSSUploadPlugin, OSSUploadOptions } from "./OSSUploadPlugin";
import { TransferFile } from "../core/types";

export interface ImportStatusResponse {
  importJobId: string;
  status: "pending" | "processing" | "uploading" | "downloading" | "converting" | "processing_images" | "creating_document" | "saving" | "complete" | "failed";
  progress: number;
  message: string;
  docId?: string;
  title?: string;
  error?: string;
}

export interface ImportPluginOptions extends OSSUploadOptions {
  startImport: (data: {
    importJobId: string;
    fileKey: string;
  }) => Promise<{
    importJobId: string;
    jobId: string;
  }>;

  pollStatus: (importJobId: string) => Promise<ImportStatusResponse>;

  pollInterval?: number;
  pollTimeout?: number;
}

export class ImportPlugin extends OSSUploadPlugin {
  private importOptions: ImportPluginOptions;
  private readonly POLL_INTERVAL: number;
  private readonly POLL_TIMEOUT: number;

  constructor(options: ImportPluginOptions) {
    super(options);
    this.importOptions = options;
    this.POLL_INTERVAL = options.pollInterval || 1500;
    this.POLL_TIMEOUT = options.pollTimeout || 120000;
  }

  async transferFile(file: TransferFile): Promise<void> {
    try {
      // Phase 1: Upload to OSS (0-50% progress)
      await this.uploadPhase(file);

      // Phase 2: Start import job (50% progress)
      await this.startImportPhase(file);

      // Phase 3: Poll for completion (50-100% progress)
      await this.pollingPhase(file);

      // Phase 4: Complete
      this.transfer.updateFileStatus(file.id, "complete", 100);
      this.transfer.emitter.emit("complete", file);
    } catch (error) {
      this.transfer.updateFileStatus(file.id, "failed");
      this.transfer.emitter.emit("error", file, error);
      throw error;
    }
  }

  /**
   * Phase 1: Upload file to OSS
   * Progress: 0-50%
   */
  private async uploadPhase(file: TransferFile): Promise<void> {
    // Get credentials
    const credentials = await this.getUploadCredentials(file);

    this.transfer.appendItemProps(file.id, {
      fileKey: credentials.fileKey,
      fileId: credentials.fileId,
      importJobId: credentials.fileId, // Use fileId as importJobId
    });

    // Upload with scaled progress (0-50%)
    this.transfer.updateFileStatus(file.id, "uploading", 0);

    await this.uploadWithScaledProgress(file, credentials.uploadUrl, 0, 50);
  }

  /**
   * Phase 2: Start import job
   * Progress: 50%
   */
  private async startImportPhase(file: TransferFile): Promise<void> {
    this.transfer.updateFileStatus(file.id, "processing", 50);

    const result = await this.importOptions.startImport({
      importJobId: file.importJobId,
      fileKey: file.fileKey,
    });

    this.transfer.appendItemProps(file.id, {
      importJobId: result.importJobId,
      jobId: result.jobId,
    });
  }

  /**
   * Phase 3: Poll for import completion
   * Progress: 50-100%
   */
  private async pollingPhase(file: TransferFile): Promise<void> {
    const startTime = Date.now();

    while (true) {
      // Check timeout
      if (Date.now() - startTime > this.POLL_TIMEOUT) {
        throw new Error("Import timeout - operation took longer than expected");
      }

      // Poll status
      const status = await this.importOptions.pollStatus(file.importJobId);

      // Scale progress from 50-100%
      const scaledProgress = 50 + (status.progress / 100) * 50;
      this.transfer.updateFileProgress(file.id, Math.round(scaledProgress));

      // Check completion
      if (status.status === "complete") {
        this.transfer.appendItemProps(file.id, {
          docId: status.docId,
          title: status.title,
        });
        return;
      }

      // Check failure
      if (status.status === "failed") {
        throw new Error(status.error || "Import failed");
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, this.POLL_INTERVAL));
    }
  }

  /**
   * Upload file with progress scaled to a range
   */
  private async uploadWithScaledProgress(file: TransferFile, uploadUrl: string, startPercent: number, endPercent: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const uploadPercent = (e.loaded / e.total) * 100;
          const scaledPercent = startPercent + (uploadPercent / 100) * (endPercent - startPercent);
          this.transfer.updateFileProgress(file.id, Math.round(scaledPercent));
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200 || xhr.status === 204) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => reject(new Error("Network error")));
      xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.data.type || "application/octet-stream");
      xhr.send(file.data);

      this.transfer.appendItemProps(file.id, { xhr });
    });
  }
}
