import { Injectable, Logger } from "@nestjs/common";
import { OssService } from "./oss.service";
import { FilePathService } from "./file-path.service";
import { FileContext } from "./file-context.enum";

/**
 * File Cleanup Service
 *
 * Handles cleanup of files from OSS storage
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
   * Delete multiple files from OSS
   */
  async deleteFiles(fileKeys: string[]): Promise<void> {
    this.logger.log(`Deleting ${fileKeys.length} files`);

    for (const fileKey of fileKeys) {
      try {
        await this.deleteFile(fileKey);
      } catch (error) {
        this.logger.warn(`Failed to delete file ${fileKey}:`, error);
        // Continue with other files even if one fails
      }
    }

    this.logger.log(`Completed deletion of ${fileKeys.length} files`);
  }

  /**
   * Cleanup all files related to a failed import
   */
  async cleanupFailedImport(params: {
    userId: string;
    importJobId: string;
    tempFileKey?: string;
    documentFileKeys?: string[];
  }): Promise<void> {
    const { userId, importJobId, tempFileKey, documentFileKeys } = params;

    this.logger.log(`Cleaning up failed import: ${importJobId}`);

    const allFileKeys: string[] = [];

    // Add temp file if exists
    if (tempFileKey) {
      allFileKeys.push(tempFileKey);
    }

    // Add document files if exist
    if (documentFileKeys && documentFileKeys.length > 0) {
      allFileKeys.push(...documentFileKeys);
    }

    // Delete all files
    if (allFileKeys.length > 0) {
      await this.deleteFiles(allFileKeys);
    }

    this.logger.log(`Completed cleanup for failed import: ${importJobId}`);
  }
}
