import { Body, Controller, Post, Logger } from "@nestjs/common";
import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { ImportDocumentService } from "./import-document.service";
import { GetUser } from "@/auth/decorators/get-user.decorator";

const importMarkdownSchema = z.object({
  markdown: z.string().min(1, "Markdown content is required"),
  workspaceId: z.string().min(1, "Workspace ID is required"),
  subspaceId: z.string().min(1, "Subspace ID is required"),
  title: z.string().min(1, "Document title is required"),
});

const importHtmlSchema = z.object({
  html: z.string().min(1, "HTML content is required"),
  workspaceId: z.string().min(1, "Workspace ID is required"),
  subspaceId: z.string().min(1, "Subspace ID is required"),
  title: z.string().min(1, "Document title is required"),
});

class ImportMarkdownDto extends createZodDto(importMarkdownSchema) {}
class ImportHtmlDto extends createZodDto(importHtmlSchema) {}

@Controller("api/documents-import")
export class ImportDocumentController {
  private readonly logger = new Logger(ImportDocumentController.name);

  constructor(private readonly importService: ImportDocumentService) {}

  @Post("markdown")
  async importMarkdown(@GetUser("id") userId: string, @Body() dto: ImportMarkdownDto) {
    this.logger.log(`Received markdown import request: ${dto.title}`);

    const document = await this.importService.importMarkdown({
      markdown: dto.markdown,
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

  @Post("html")
  async importHtml(@GetUser("id") userId: string, @Body() dto: ImportHtmlDto) {
    this.logger.log(`Received HTML import request: ${dto.title}`);

    const document = await this.importService.importHtml({
      html: dto.html,
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
