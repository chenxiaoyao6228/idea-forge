/**
 * @idea/editor - Shared isomorphic TipTap editor package
 *
 * This package contains the core editor extensions, parsers, and utilities
 * that can be used in both client and server environments.
 *
 * @packageDocumentation
 */

// Version
export const version = "0.1.0";

// Node extensions
import { Document } from "./extensions/nodes/document";
import { Heading, type HeadingOptions } from "./extensions/nodes/heading";
import { Paragraph, type ParagraphOptions } from "./extensions/nodes/paragraph";
import { Text } from "./extensions/nodes/text";

// Re-export all node extensions and their types
export { Document, Heading, Paragraph, Text };
export type { HeadingOptions, ParagraphOptions };

// Markdown extension and types
export { Markdown, type MarkdownOptions, type MarkdownStorage } from "./markdown";
export type { NodeMarkdownStorage, MarkMarkdownStorage, MarkdownNode, Attrs } from "./markdown/types";

// Additional markdown types
export type { ParserState, SerializerState } from "./markdown";

/**
 * Core extension collection
 * Will include all core nodes and marks once migration is complete
 */
export const coreExtensions = [Document, Heading, Paragraph, Text];
