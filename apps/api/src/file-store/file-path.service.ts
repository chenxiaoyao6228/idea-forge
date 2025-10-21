import { Injectable } from "@nestjs/common";
import { FileContext } from "./file-context.enum";
import { v4 as uuidv4 } from "uuid";

interface GenerateFileKeyParams {
  userId?: string;
  fileName: string;
  context: FileContext;
  workspaceId?: string;
  docId?: string;
  importJobId?: string;
}

/**
 * File Path Service
 *
 * Generates consistent file paths for different file contexts
 * Centralizes path generation logic for OSS storage
 */
@Injectable()
export class FilePathService {
  /**
   * Generate a file key for OSS storage based on context
   */
  generateFileKey(params: GenerateFileKeyParams): string {
    const { context, fileName, userId, workspaceId, docId, importJobId } = params;

    // Extract file extension
    const ext = this.getFileExtension(fileName);
    const uuid = uuidv4();
    const timestamp = Date.now();

    switch (context) {
      // System assets
      case FileContext.SYSTEM_COVER:
        return `system/covers/${fileName}`;
      case FileContext.SYSTEM_TEMPLATE:
        return `system/templates/${fileName}`;

      // User uploads (existing)
      case FileContext.USER_IMAGE:
        if (!userId) throw new Error("userId required for USER_IMAGE context");
        return `uploads/u-${userId}/${fileName}`;
      case FileContext.USER_OTHER:
        if (!userId) throw new Error("userId required for USER_OTHER context");
        return `uploads/u-${userId}/${fileName}`;

      // Import temp files
      case FileContext.IMPORT_TEMP:
        if (!userId) throw new Error("userId required for IMPORT_TEMP context");
        return `uploads/u-${userId}/imports/temp/${timestamp}-${fileName}`;

      // Import attachments (extracted images from DOCX)
      case FileContext.IMPORT_ATTACHMENT:
        if (!userId) throw new Error("userId required for IMPORT_ATTACHMENT context");
        if (!importJobId) throw new Error("importJobId required for IMPORT_ATTACHMENT context");
        return `uploads/u-${userId}/imports/attachments/${importJobId}/${uuid}.${ext}`;

      // Document cover images
      case FileContext.DOCUMENT_COVER:
        if (!userId) throw new Error("userId required for DOCUMENT_COVER context");
        if (!workspaceId) throw new Error("workspaceId required for DOCUMENT_COVER context");
        if (!docId) throw new Error("docId required for DOCUMENT_COVER context");
        return `uploads/u-${userId}/documents/${workspaceId}/${docId}/cover.${ext}`;

      // Document attachments
      case FileContext.DOCUMENT_ATTACHMENT:
        if (!userId) throw new Error("userId required for DOCUMENT_ATTACHMENT context");
        if (!workspaceId) throw new Error("workspaceId required for DOCUMENT_ATTACHMENT context");
        if (!docId) throw new Error("docId required for DOCUMENT_ATTACHMENT context");
        return `uploads/u-${userId}/documents/${workspaceId}/${docId}/attachments/${uuid}.${ext}`;

      default:
        throw new Error(`Unknown file context: ${context}`);
    }
  }

  /**
   * Extract file extension from filename
   */
  private getFileExtension(fileName: string): string {
    const parts = fileName.split(".");
    return parts.length > 1 ? parts[parts.length - 1] : "";
  }

  /**
   * Get the directory path for a context (used for cleanup)
   */
  getContextDirectory(
    context: FileContext,
    params: {
      userId?: string;
      workspaceId?: string;
      docId?: string;
      importJobId?: string;
    },
  ): string {
    const { userId, workspaceId, docId, importJobId } = params;

    switch (context) {
      case FileContext.SYSTEM_COVER:
        return "system/covers/";
      case FileContext.SYSTEM_TEMPLATE:
        return "system/templates/";
      case FileContext.USER_IMAGE:
      case FileContext.USER_OTHER:
        if (!userId) throw new Error("userId required for user context directory");
        return `uploads/u-${userId}/`;
      case FileContext.IMPORT_TEMP:
        if (!userId) throw new Error("userId required for import temp directory");
        return `uploads/u-${userId}/imports/temp/`;
      case FileContext.IMPORT_ATTACHMENT:
        if (!userId || !importJobId) throw new Error("userId and importJobId required for import attachment directory");
        return `uploads/u-${userId}/imports/attachments/${importJobId}/`;
      case FileContext.DOCUMENT_COVER:
        if (!userId || !workspaceId || !docId) throw new Error("userId, workspaceId, and docId required for document cover directory");
        return `uploads/u-${userId}/documents/${workspaceId}/${docId}/`;
      case FileContext.DOCUMENT_ATTACHMENT:
        if (!userId || !workspaceId || !docId) throw new Error("userId, workspaceId, and docId required for document attachment directory");
        return `uploads/u-${userId}/documents/${workspaceId}/${docId}/attachments/`;
      default:
        throw new Error(`Unknown file context: ${context}`);
    }
  }
}
