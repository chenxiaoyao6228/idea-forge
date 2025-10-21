import { Body, Controller, Post, Logger } from "@nestjs/common";
import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { ImportDocumentService } from "./import-document.service";
import { GetUser } from "@/auth/decorators/get-user.decorator";

// FIXME: restructure this controller, create a separate import related api
const importDocumentSchema = z.object({
  content: z.string().min(1, "Content is required"),
  fileName: z.string().min(1, "File name is required"),
  mimeType: z.string().min(1, "MIME type is required"),
  workspaceId: z.string().min(1, "Workspace ID is required"),
  subspaceId: z.string().min(1, "Subspace ID is required"),
  title: z.string().min(1, "Document title is required"),
});

class ImportDocumentDto extends createZodDto(importDocumentSchema) {}

/**
 * Document Import Controller
 *
 * Provides a unified API endpoint for importing documents from various formats:
 * - Markdown (.md, text/markdown)
 * - HTML (.html, text/html)
 * - DOCX (.docx, application/vnd.openxmlformats-officedocument.wordprocessingml.document)
 * - CSV (.csv, text/csv)
 */
@Controller("api/documents-import")
export class ImportDocumentController {
  private readonly logger = new Logger(ImportDocumentController.name);

  constructor(private readonly importService: ImportDocumentService) {}

  /**
   * Import document from external format
   *
   * POST /api/documents-import
   *
   * Body:
   * - content: string - The file content (for binary files like DOCX, send as base64)
   * - fileName: string - Original file name with extension
   * - mimeType: string - MIME type of the file
   * - workspaceId: string - Target workspace ID
   * - subspaceId: string - Target subspace ID
   * - title: string - Document title
   *
   * Supported formats:
   * - Markdown: text/markdown or .md extension
   * - HTML: text/html or .html extension
   * - DOCX: application/vnd.openxmlformats-officedocument.wordprocessingml.document or .docx extension
   * - CSV: text/csv or .csv extension
   */
  @Post()
  async importDocument(@GetUser("id") userId: string, @Body() dto: ImportDocumentDto) {
    this.logger.log(`Received import request: ${dto.title} (${dto.fileName}, ${dto.mimeType})`);

    const document = await this.importService.importDocument({
      content: dto.content,
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      workspaceId: dto.workspaceId,
      subspaceId: dto.subspaceId,
      title: dto.title,
      authorId: userId,
    });

    return {
      success: true,
      document: {
        id: document.id,
        title: document.title,
        workspaceId: document.workspaceId,
        subspaceId: document.subspaceId,
        createdAt: document.createdAt,
      },
    };
  }
}
