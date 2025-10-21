import { Injectable } from "@nestjs/common";
import { FileContext } from "./file-context.enum";
import { v4 as uuidv4 } from "uuid";

interface GenerateFileKeyParams {
  userId?: string;
  fileName: string;
  context: FileContext;
  workspaceId?: string;
  subspaceId?: string;
  docId?: string;
  subType?: string; // Optional subtype for SYSTEM context (e.g., 'covers', 'templates')
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
    const { context, fileName, userId } = params;

    // Extract file extension
    const ext = this.getFileExtension(fileName);
    const uuid = uuidv4();
    const timestamp = Date.now();

    switch (context) {
      // System assets (admin-only resources)
      case FileContext.SYSTEM:
        // Optionally organize by subtype (covers, templates, etc.)
        return `system/${fileName}`;

      // User uploads (avatars, temp files, general uploads)
      // Also supports workspace/subspace-scoped files
      case FileContext.USER:
        // User files: uploads/u-${userId}/${timestamp}-${uuid}.${ext}
        return `uploads/u-${userId}/${timestamp}-${uuid}.${ext}`;

      // Document content (covers, attachments, imported images)
      case FileContext.DOCUMENT:
        return `uploads/d-${userId}/${uuid}.${ext}`;

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
      subType?: string;
    },
  ): string {
    const { userId, workspaceId, docId, subType } = params;

    switch (context) {
      case FileContext.SYSTEM:
        // System directory with optional subtype
        return subType ? `system/${subType}/` : "system/";

      case FileContext.USER:
        if (!userId) throw new Error("userId required for USER context directory");
        return `uploads/u-${userId}/`;

      case FileContext.DOCUMENT:
        if (!userId || !workspaceId || !docId) {
          throw new Error("userId, workspaceId, and docId required for DOCUMENT context directory");
        }
        return `uploads/u-${userId}/docs/${workspaceId}/${docId}/`;

      default:
        throw new Error(`Unknown file context: ${context}`);
    }
  }
}
