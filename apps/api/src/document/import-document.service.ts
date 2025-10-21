import { Injectable, Logger } from "@nestjs/common";
import * as Y from "yjs";
import { tiptapTransformer } from "@/collaboration/extensions/transformer";
import { DocumentService } from "./document.service";
import { convertToTiptapJSON } from "@/_shared/utils/document-converter";

/*
 * Document Import Service
 * Imports external formats (Markdown, HTML, DOCX, CSV) into Idea Forge documents
 * Flow: External Format -> HTML -> TipTap JSON -> Yjs Binary -> Database
 */

export interface ImportDocumentParams {
  content: Buffer | string;
  fileName: string;
  mimeType: string;
  workspaceId: string;
  subspaceId: string;
  title: string;
  authorId: string;
}

/**
 * Service for importing documents from external formats (Markdown, HTML, etc.)
 */
@Injectable()
export class ImportDocumentService {
  private readonly logger = new Logger(ImportDocumentService.name);

  constructor(private readonly documentService: DocumentService) {}

  /**
   * Import document from external format and create a new document
   *
   * Supports: Markdown (.md), HTML (.html), DOCX (.docx), CSV (.csv)
   *
   * Flow:
   * 1. Convert external format to TipTap JSON (via convertToTiptapJSON)
   * 2. Convert TipTap JSON to Yjs binary
   * 3. Create document with Yjs binary content
   *
   * @param params Import parameters (content, fileName, mimeType, workspaceId, subspaceId, title, authorId)
   * @returns Created document
   */
  async importDocument(params: ImportDocumentParams) {
    const { content, fileName, mimeType, workspaceId, subspaceId, title, authorId } = params;
    this.logger.log(`Importing document: ${title} (${fileName}, ${mimeType})`);

    try {
      // Step 1: Convert external format to TipTap JSON
      const json = await convertToTiptapJSON(content, fileName, mimeType);
      this.logger.log(`Converted ${fileName} to TipTap JSON for document: ${title}`);

      // Step 2: Convert TipTap JSON to Yjs document
      const ydoc = tiptapTransformer.toYdoc(json, "default");

      // Step 3: Encode Yjs document to binary
      const contentBinary = Y.encodeStateAsUpdate(ydoc);

      this.logger.log(`Converted JSON to Yjs binary for document: ${title}`);

      // Step 4: Create document with content and binary in one operation
      const document = await this.documentService.create(authorId, {
        workspaceId,
        subspaceId,
        title,
        type: "NOTE",
        content: JSON.stringify(json),
        contentBinary: Buffer.from(contentBinary),
        visibility: "WORKSPACE",
      });

      this.logger.log(`Successfully imported ${fileName} into document ${document.id}`);
      return document;
    } catch (error) {
      this.logger.error(`Failed to import document: ${fileName}`, error);
      throw error;
    }
  }
}
