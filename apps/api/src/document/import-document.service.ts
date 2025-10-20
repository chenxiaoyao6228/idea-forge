import { Injectable, Logger } from "@nestjs/common";
import { coreExtensions } from "@idea/editor";
import { generateJSON } from "@tiptap/html";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

/**
 * Service for importing documents from external formats (Markdown, HTML, etc.)
 */
@Injectable()
export class ImportDocumentService {
  private readonly logger = new Logger(ImportDocumentService.name);

  /**
   * Import markdown content and convert to TipTap JSON
   * Server-side implementation using unified pipeline:
   * Markdown → HTML → TipTap JSON
   *
   * @param markdown Markdown string content
   * @returns TipTap JSON document
   */
  async importMarkdown(markdown: string) {
    this.logger.log("Importing markdown document");

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

      // Step 2: Convert HTML to TipTap JSON using @tiptap/html
      const doc = generateJSON(html, [
        ...coreExtensions,
        // Add more extensions as needed for your document schema
      ]);

      this.validateDocument(doc);

      this.logger.log("Successfully converted markdown to TipTap JSON");
      return doc;
    } catch (error) {
      this.logger.error("Failed to import markdown", error);
      throw error;
    }
  }

  /**
   * Validate that the imported document structure is correct
   * @param doc TipTap JSON document
   * @returns boolean indicating if document is valid
   */
  validateDocument(doc: any): boolean {
    // Basic validation: check for required structure
    if (!doc || typeof doc !== "object") {
      return false;
    }

    if (doc.type !== "doc") {
      return false;
    }

    if (!Array.isArray(doc.content)) {
      return false;
    }

    return true;
  }
}
