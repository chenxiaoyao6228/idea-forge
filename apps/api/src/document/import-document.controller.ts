import { Body, Controller, Post, Logger } from "@nestjs/common";
import { z } from "zod";
import { createZodDto } from "nestjs-zod";
import { ImportDocumentService } from "./import-document.service";
import { Public } from "@/auth/decorators/public.decorator";

const importMarkdownSchema = z.object({
  markdown: z.string().min(1, "Markdown content is required"),
});

class ImportMarkdownDto extends createZodDto(importMarkdownSchema) {}

@Controller("api/documents-import")
export class ImportDocumentController {
  private readonly logger = new Logger(ImportDocumentController.name);

  constructor(private readonly importService: ImportDocumentService) {}

  @Post("markdown")
  @Public()
  async importMarkdown(@Body() dto: ImportMarkdownDto) {
    this.logger.log("Received markdown import request");

    const doc = await this.importService.importMarkdown(dto.markdown);

    return {
      success: !!doc,
      invalid: !doc,
      document: doc || null,
    };
  }
}
