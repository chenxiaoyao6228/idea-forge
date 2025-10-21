import { Injectable, Logger } from "@nestjs/common";
import { OssService } from "./oss.service";
import { FilePathService } from "./file-path.service";
import { FileContext } from "./file-context.enum";

/**
 * File Cleanup Service
 *
 * Handles cleanup of temporary files and directories
 * Used for import temp files and extracted attachments
 */
@Injectable()
export class FileCleanupService {
  private readonly logger = new Logger(FileCleanupService.name);

  constructor(
    private readonly ossService: OssService,
    private readonly filePathService: FilePathService,
  ) {}

  /**
   * Delete a single file from OSS
   */
  async deleteFile(fileKey: string): Promise<void> {
    try {
      await this.ossService.deleteFile(fileKey);
      this.logger.log(`Deleted file: ${fileKey}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${fileKey}:`, error);
      throw error;
    }
  }

  /**
   * Cleanup import temp file
   */
  async cleanupImportTempFile(params: {
    userId: string;
    fileName: string;
  }): Promise<void> {
    // We can't delete by context directly since we need the exact filename with timestamp
    // This method is for when we have the exact file key
    const { userId, fileName } = params;
    const fileKey = this.filePathService.generateFileKey({
      context: FileContext.IMPORT_TEMP,
      userId,
      fileName,
    });

    await this.deleteFile(fileKey);
  }

  /**
   * Cleanup import temp file by exact key
   */
  async cleanupImportTempFileByKey(fileKey: string): Promise<void> {
    await this.deleteFile(fileKey);
  }

  /**
   * Delete import attachment directory (all extracted images for an import job)
   * Note: For Phase 1, we'll delete files individually as we know their keys
   * In Phase 2, we might add bulk directory deletion support
   */
  async cleanupImportAttachmentDirectory(params: {
    userId: string;
    importJobId: string;
    fileKeys: string[]; // For Phase 1, we'll track file keys
  }): Promise<void> {
    const { userId, importJobId, fileKeys } = params;

    this.logger.log(`Cleaning up import attachment directory for job: ${importJobId}`);

    // Delete all files in the directory
    for (const fileKey of fileKeys) {
      try {
        await this.deleteFile(fileKey);
      } catch (error) {
        this.logger.warn(`Failed to delete attachment ${fileKey}:`, error);
        // Continue with other files even if one fails
      }
    }

    this.logger.log(`Cleaned up ${fileKeys.length} files for import job: ${importJobId}`);
  }

  /**
   * Cleanup all files related to a failed import
   */
  async cleanupFailedImport(params: {
    userId: string;
    importJobId: string;
    tempFileKey?: string;
    attachmentFileKeys?: string[];
  }): Promise<void> {
    const { userId, importJobId, tempFileKey, attachmentFileKeys } = params;

    this.logger.log(`Cleaning up failed import: ${importJobId}`);

    // Delete temp file if exists
    if (tempFileKey) {
      try {
        await this.deleteFile(tempFileKey);
      } catch (error) {
        this.logger.warn(`Failed to delete temp file ${tempFileKey}:`, error);
      }
    }

    // Delete attachment files if exist
    if (attachmentFileKeys && attachmentFileKeys.length > 0) {
      await this.cleanupImportAttachmentDirectory({
        userId,
        importJobId,
        fileKeys: attachmentFileKeys,
      });
    }

    this.logger.log(`Completed cleanup for failed import: ${importJobId}`);
  }
}
