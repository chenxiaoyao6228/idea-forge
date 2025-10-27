/**
 * TipTap extensions for server-side document processing
 *
 * Imports isomorphic extensions from @idea/editor package.
 * These extensions work on both client and server without React dependencies.
 * Used by generateJSON to parse HTML into TipTap document structure.
 */

import {
  Document,
  Paragraph,
  Text,
  Heading,
  Blockquote,
  HorizontalRule,
  HardBreak,
  BulletList,
  OrderedList,
  ListItem,
  TaskList,
  TaskItem,
  Bold,
  Italic,
  Strike,
  Underline,
  Code,
  Link,
  HighlightMark,
  Subscript,
  Superscript,
  Table,
  TableCell,
  TableHeader,
  TableRow,
  CodeBlock,
  ImageBlock,
  EmojiNode,
  Mathematics,
} from "@idea/editor";
import type { Extensions } from "@tiptap/core";

/**
 * Server-side extensions for document parsing
 *
 * All extensions from @idea/editor are isomorphic - they work on both client and server.
 * CodeBlock and ImageBlock are designed to be extended by client with React NodeViews,
 * but their base implementations work fine for server-side parsing.
 */
export const serverExtensions: Extensions = [
  // Document structure
  Document,
  Paragraph,
  Text,
  Heading,
  Blockquote,
  HorizontalRule,
  HardBreak,

  // Lists
  BulletList,
  OrderedList,
  ListItem,
  TaskList,
  TaskItem,

  // Text formatting marks
  Bold,
  Italic,
  Strike,
  Underline,
  Code,
  Link,
  HighlightMark,
  Subscript,
  Superscript,

  // Table extensions
  Table,
  TableCell,
  TableHeader,
  TableRow,

  // Code block (isomorphic - no syntax highlighting on server)
  CodeBlock,

  // Image block (isomorphic)
  ImageBlock,

  // Emoji
  EmojiNode,

  // Math formulas
  Mathematics,
];
