import { Injectable, Logger } from "@nestjs/common";
import { generateJSON } from "@tiptap/html";
import * as Y from "yjs";
import { tiptapTransformer } from "@/collaboration/extensions/transformer";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { DocumentService } from "./document.service";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { coreExtensions } from "@idea/editor";

/*
 * https://tiptap.dev/docs/editor/api/utilities/html
 *  https://github.com/ueberdosis/tiptap/blob/develop/packages/html/src/server/generateJSON.ts
 */

export interface ImportMarkdownParams {
  markdown: string;
  workspaceId: string;
  subspaceId: string;
  title: string;
  authorId: string;
}

export interface ImportHtmlParams {
  html: string;
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

  constructor(
    private readonly documentService: DocumentService,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * Import markdown content and create a new document
   * Server-side implementation using @idea/editor Markdown extension
   *
   * Flow:
   * 1. Parse markdown to HTML using Markdown extension
   * 2. Convert HTML to ProseMirror JSON using generateJSON
   * 3. Convert JSON to Yjs binary using tiptapTransformer
   * 4. Create document with Yjs binary content
   *
   * @param params Import parameters (markdown, workspaceId, subspaceId, title, authorId)
   * @returns Created document
   */
  async importMarkdown(params: ImportMarkdownParams) {
    const { markdown, workspaceId, subspaceId, title, authorId } = params;
    this.logger.log(`Importing markdown document: ${title}`);

    try {
      // Step 1: Convert Markdown to HTML using unified + remark
      const htmlFile = await unified()
        .use(remarkParse) // Parse markdown to AST
        .use(remarkGfm) // Add GitHub Flavored Markdown support
        .use(remarkRehype) // Convert markdown AST to HTML AST
        .use(rehypeStringify) // Convert HTML AST to string
        .process(markdown);

      const html = String(htmlFile);
      this.logger.debug(`Converted markdown to HTML: ${html.substring(0, 100)}...`);

      this.logger.log(`Parsed markdown to JSON for document: ${title}`);

      const json = generateJSON(html, coreExtensions);
      this.logger.log(`Generated ProseMirror JSON for document: ${title}`);

      // Step 2: Convert ProseMirror JSON to Yjs document
      const ydoc = tiptapTransformer.toYdoc(json, "default");

      // Step 3: Encode Yjs document to binary
      const contentBinary = Y.encodeStateAsUpdate(ydoc);

      this.logger.log(`Converted JSON to Yjs binary for document: ${title}`);

      // Step 4: Create document with the content
      const document = await this.documentService.create(authorId, {
        workspaceId,
        subspaceId,
        title,
        type: "NOTE",
        content: JSON.stringify(json),
        visibility: "WORKSPACE",
      });

      // Step 5: Update document with content binary
      // TODO: merge these two steps
      await this.prismaService.doc.update({
        where: { id: document.id },
        data: {
          contentBinary: Buffer.from(contentBinary),
        },
      });

      this.logger.log(`Successfully imported markdown into document ${document.id}`);
      return document;
    } catch (error) {
      this.logger.error("Failed to import markdown", error);
      throw error;
    }
  }

  /**
   * Import HTML content and create a new document
   * Server-side implementation using @tiptap/html generateJSON
   *
   * Flow:
   * 1. Convert HTML to ProseMirror JSON using generateJSON
   * 2. Convert JSON to Yjs binary using tiptapTransformer
   * 3. Create document with Yjs binary content
   *
   * @param params Import parameters (html, workspaceId, subspaceId, title, authorId)
   * @returns Created document
   */
  async importHtml(params: ImportHtmlParams) {
    const { html, workspaceId, subspaceId, title, authorId } = params;
    this.logger.log(`Importing HTML document: ${title}`);

    try {
      // Step 1: Convert HTML to ProseMirror JSON
      const json = generateJSON(html, coreExtensions);
      this.logger.log(`Generated ProseMirror JSON for document: ${title}`);

      // Step 2: Convert ProseMirror JSON to Yjs document
      const ydoc = tiptapTransformer.toYdoc(json, "default");

      // Step 3: Encode Yjs document to binary
      const contentBinary = Y.encodeStateAsUpdate(ydoc);

      this.logger.log(`Converted JSON to Yjs binary for document: ${title}`);

      // Step 4: Create document with the content
      const document = await this.documentService.create(authorId, {
        workspaceId,
        subspaceId,
        title,
        type: "NOTE",
        content: JSON.stringify(json),
        visibility: "WORKSPACE",
      });

      // Step 5: Update document with content binary
      await this.prismaService.doc.update({
        where: { id: document.id },
        data: {
          contentBinary: Buffer.from(contentBinary),
        },
      });

      this.logger.log(`Successfully imported HTML into document ${document.id}`);
      return document;
    } catch (error) {
      this.logger.error("Failed to import HTML", error);
      throw error;
    }
  }
}
