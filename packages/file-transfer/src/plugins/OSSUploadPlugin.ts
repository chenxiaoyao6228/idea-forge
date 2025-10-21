import { BasePlugin } from "../core/BasePlugin";
import { TransferFile } from "../core/types";
import type { FileContextType } from "@idea/contracts";

export interface OSSUploadOptions {
  context?: FileContextType;
  getCredentials: (file: TransferFile) => Promise<{
    uploadUrl: string;
    fileKey: string;
    fileId: string;
    downloadUrl: string;
  }>;
  confirmUpload: (fileKey: string, fileId: string) => Promise<void>;
}

export class OSSUploadPlugin extends BasePlugin {
  protected options: OSSUploadOptions;

  constructor(options: OSSUploadOptions) {
    super();
    this.options = options;
  }

  async transferFile(file: TransferFile): Promise<void> {
    try {
      // 1. Get upload credentials
      const credentials = await this.getUploadCredentials(file);

      // Store credentials in file metadata
      this.transfer.appendItemProps(file.id, {
        fileKey: credentials.fileKey,
        fileId: credentials.fileId,
        downloadUrl: credentials.downloadUrl,
      });

      // 2. Upload to OSS with progress tracking
      this.transfer.updateFileStatus(file.id, "uploading", 0);
      await this.uploadToOSS(file, credentials.uploadUrl);

      // 3. Confirm upload (mark as active in database)
      await this.options.confirmUpload(credentials.fileKey, credentials.fileId);

      // 4. Mark as complete
      this.transfer.updateFileStatus(file.id, "complete", 100);
      this.transfer.emitter.emit("complete", file);
    } catch (error) {
      this.transfer.updateFileStatus(file.id, "failed");
      this.transfer.emitter.emit("error", file, error);
      throw error;
    }
  }

  /**
   * Get upload credentials from backend
   */
  protected async getUploadCredentials(file: TransferFile) {
    return this.options.getCredentials(file);
  }

  /**
   * Upload file to OSS using XMLHttpRequest for progress tracking
   */
  protected async uploadToOSS(file: TransferFile, uploadUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          this.transfer.updateFileProgress(file.id, percent);
        }
      });

      // Handle completion
      xhr.addEventListener("load", () => {
        if (xhr.status === 200 || xhr.status === 204) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      // Handle errors
      xhr.addEventListener("error", () => {
        reject(new Error("Network error during upload"));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload aborted"));
      });

      // Start upload
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.data.type || "application/octet-stream");
      xhr.send(file.data);

      // Store XHR for cancellation
      this.transfer.appendItemProps(file.id, { xhr });
    });
  }
}
