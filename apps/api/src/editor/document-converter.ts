import { parse } from "@fast-csv/parse";
import escapeRegExp from "lodash/escapeRegExp";
import mammoth from "mammoth";
import { generateJSON } from "@tiptap/html";
import { detectFileType } from "@idea/utils";
import { serverExtensions } from "./extensions";
import { markdownToHtml } from "./markdown-converter";

/**
 * Custom error for file import failures
 */
export class FileImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileImportError";
  }
}

/**
 * Document Import Architecture
 *
 * Idea Forge uses HTML as the universal bridge format for document imports.
 * This design leverages TipTap's native generateJSON function which expects HTML input.
 *
 * Import Flow:
 * - Markdown -> HTML (via unified) -> TipTap JSON
 * - HTML -> TipTap JSON (direct)
 * - DOCX -> HTML (via mammoth) -> TipTap JSON
 * - CSV -> Markdown table -> HTML -> TipTap JSON
 *
 * Storage: Documents are stored as Yjs binary (collaborative CRDT format)
 */

/**
 * Convert an incoming file to TipTap JSON format.
 *
 * Detects the actual file type using magic number detection for improved security
 * and accuracy. Falls back to mimeType parameter and fileName extension if detection fails.
 *
 * @param content The content of the file (Buffer for binary files, string for text)
 * @param fileName The name of the file, including extension
 * @param mimeType The mime type of the file (may be provided by client, will be validated)
 * @returns The TipTap JSON representation of the file
 */
export async function convertToTiptapJSON(content: Buffer | string, fileName: string, mimeType: string): Promise<Record<string, any>> {
  // Detect actual file type from content (for binary files only)
  // Text formats (md, html, csv) cannot be detected via magic numbers
  let detectedMimeType = mimeType;

  if (content instanceof Buffer) {
    const detectedType = await detectFileType(content);
    if (detectedType) {
      detectedMimeType = detectedType.mimeType;

      // Log warning if client-provided mimeType doesn't match detected type
      if (mimeType !== detectedMimeType && mimeType !== "application/octet-stream") {
        console.warn(`File type mismatch for ${fileName}: ` + `provided "${mimeType}" but detected "${detectedMimeType}"`);
      }
    }
  }

  // First try to convert the file based on the detected/provided mime type
  switch (detectedMimeType) {
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return docxToTiptapJSON(content);
    case "text/html":
      return htmlToTiptapJSON(content);
    case "text/plain":
    case "text/markdown":
      return markdownToTiptapJSON(content);
    case "text/csv":
      return csvToTiptapJSON(content);
    default:
      break;
  }

  // If the mime type doesn't work, try to convert based on the file extension
  const extension = fileName.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "docx":
      return docxToTiptapJSON(content);
    case "html":
    case "htm":
      return htmlToTiptapJSON(content);
    case "md":
    case "markdown":
      return markdownToTiptapJSON(content);
    case "csv":
      return csvToTiptapJSON(content);
    default:
      throw new FileImportError(`File type not supported. Detected: ${detectedMimeType}, Extension: ${extension || "none"}`);
  }
}

/**
 * Convert DOCX file to TipTap JSON
 *
 * Uses mammoth.js to extract HTML from Word documents, then converts to TipTap JSON.
 * Flow: DOCX -> HTML (via mammoth) -> TipTap JSON (via generateJSON)
 *
 * @param content - DOCX file as Buffer or base64-encoded string
 */
export async function docxToTiptapJSON(content: Buffer | string): Promise<Record<string, any>> {
  let buffer: Buffer;

  if (content instanceof Buffer) {
    buffer = content;
  } else if (typeof content === "string") {
    // Assume the string is base64-encoded (common when sent over HTTP/JSON)
    buffer = Buffer.from(content, "base64");
  } else {
    throw new FileImportError("DOCX content must be a Buffer or base64 string");
  }

  // Convert DOCX to HTML using mammoth
  const { value: html } = await mammoth.convertToHtml({
    buffer,
  });

  // Convert HTML to TipTap JSON
  return htmlToTiptapJSON(html);
}

/**
 * Convert HTML to TipTap JSON
 *
 * This is the most direct conversion path - TipTap's generateJSON natively accepts HTML.
 * Flow: HTML -> TipTap JSON (via generateJSON)
 */
export async function htmlToTiptapJSON(content: Buffer | string): Promise<Record<string, any>> {
  const html = typeof content === "string" ? content : content.toString("utf8");

  // Use TipTap's generateJSON to convert HTML to TipTap JSON
  return generateJSON(html, serverExtensions);
}

/**
 * Convert Markdown to TipTap JSON
 *
 * Uses the editor package's markdown converter for consistent parsing.
 * Supports GitHub Flavored Markdown (tables, task lists, strikethrough, etc.)
 * and math formulas (inline: $...$ and block: $$...$$).
 * Flow: Markdown -> HTML (via @idea/editor/server) -> TipTap JSON (via generateJSON)
 */
export async function markdownToTiptapJSON(content: Buffer | string): Promise<Record<string, any>> {
  const markdown = typeof content === "string" ? content : content.toString("utf8");

  // Step 1: Convert Markdown to HTML using editor package's converter
  // This ensures consistency with client-side markdown parsing
  const html = await markdownToHtml(markdown);

  // Step 2: Convert HTML to TipTap JSON
  return htmlToTiptapJSON(html);
}

/**
 * Convert CSV to TipTap JSON
 *
 * Converts CSV data to a markdown table format, then follows the markdown import pipeline.
 * Flow: CSV -> Markdown table -> HTML -> TipTap JSON
 */
export async function csvToTiptapJSON(content: Buffer | string): Promise<Record<string, any>> {
  // Convert CSV to Markdown table format
  const markdownTable = await convertCsvToMarkdownTable(content);

  // Convert Markdown table to TipTap JSON
  return markdownToTiptapJSON(markdownTable);
}

/**
 * Convert CSV content to Markdown table format
 *
 * Detects the delimiter (comma, semicolon, or tab) and formats as a GFM table.
 * The first row is treated as table headers.
 */
async function convertCsvToMarkdownTable(content: Buffer | string): Promise<string> {
  return new Promise((resolve, reject) => {
    const text = (typeof content === "string" ? content : content.toString("utf8")).trim();

    if (!text) {
      resolve("");
      return;
    }

    const headerRow = text.split("\n")[0];

    // Auto-detect delimiter by counting occurrences in the header row
    const detectedDelimiter = [",", ";", "\t"].reduce(
      (best, separator) => {
        const occurrences = (headerRow.match(new RegExp(escapeRegExp(separator), "g")) || []).length;
        return occurrences > best.count ? { count: occurrences, separator } : best;
      },
      { count: 0, separator: "," },
    ).separator;

    const rows: string[][] = [];
    const parseStream = parse({ delimiter: detectedDelimiter })
      .on("error", (error) => {
        reject(new FileImportError(`CSV parsing failed: ${error}`));
      })
      .on("data", (row) => rows.push(row))
      .on("end", () => {
        if (rows.length === 0) {
          resolve("");
          return;
        }

        const headers = rows[0];
        const dataRows = rows.slice(1);

        // Build markdown table
        const headerLine = `| ${headers.join(" | ")} |`;
        const separatorLine = `| ${headers.map(() => "---").join(" | ")} |`;
        const tableBody = dataRows.map((cells) => `| ${cells.join(" | ")} |`).join("\n");

        const markdownTable = [headerLine, separatorLine, tableBody].filter(Boolean).join("\n") + "\n";
        resolve(markdownTable);
      });

    parseStream.write(text);
    parseStream.end();
  });
}
