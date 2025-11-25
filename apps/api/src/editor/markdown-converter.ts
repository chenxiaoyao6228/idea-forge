/**
 * Server-side markdown to HTML converter
 *
 * Converts markdown to HTML format compatible with TipTap editor.
 * Used for document imports (markdown files → TipTap JSON).
 */

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkGemoji from "remark-gemoji";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { rehypeTiptapMath } from "./rehype-tiptap-math";

/**
 * Convert Markdown to HTML
 *
 * This converter uses the same plugins as the editor's markdown extension:
 * - remarkGfm: GitHub Flavored Markdown (tables, task lists, strikethrough, etc.)
 * - remarkMath: Math formulas (inline: $...$ and block: $$...$$)
 * - remarkGemoji: Convert :emoji: shortcodes to Unicode emoji (e.g., :smile: → 😄)
 * - rehypeTiptapMath: Converts math to TipTap-compatible HTML format
 *
 * @param markdown - Markdown string to convert
 * @returns HTML string with TipTap-compatible math nodes
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  const htmlFile = await unified()
    .use(remarkParse) // Parse markdown to AST
    .use(remarkGfm) // GitHub Flavored Markdown (tables, task lists, etc.)
    .use(remarkMath) // Math formulas (inline: $...$ and block: $$...$$)
    .use(remarkGemoji) // Convert :emoji: shortcodes to Unicode emoji
    .use(remarkRehype) // Convert markdown AST to HTML AST
    .use(rehypeTiptapMath) // Convert math to TipTap format (data-type, data-latex)
    .use(rehypeStringify) // Convert HTML AST to string
    .process(markdown);

  let html = String(htmlFile);

  // Decode HTML entities in data-latex attributes
  // rehype-stringify encodes special characters in attributes, but we need raw LaTeX
  html = html.replace(/data-latex="([^"]*)"/g, (match, latex) => {
    const decoded = latex
      .replace(/&#x26;/g, "&")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x60;/g, "`");
    return `data-latex="${decoded}"`;
  });

  return html;
}
