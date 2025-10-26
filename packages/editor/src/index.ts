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
import { Document } from "./extensions/document";
import { Heading, type HeadingOptions } from "./extensions/heading";
import { Paragraph, type ParagraphOptions } from "./extensions/paragraph";
import { Text } from "./extensions/text";
import { Blockquote } from "./extensions/block-quote";
import { HorizontalRule } from "./extensions/horizontal-rule";
import { HardBreak, type HardBreakOptions } from "./extensions/hard-break";
import { BulletList, type BulletListOptions } from "./extensions/bullet-list";
import { OrderedList, type OrderedListOptions } from "./extensions/ordered-list";
import { ListItem, type ListItemOptions } from "./extensions/list-item";
import { TaskList, type TaskListOptions } from "./extensions/task-list";
import { TaskItem, type TaskItemOptions } from "./extensions/task-item";

// Mark extensions
import { Bold } from "./extensions/bold";
import { Italic, type ItalicOptions } from "./extensions/italic";
import { Strike, type StrikeOptions } from "./extensions/strike";
import { Underline, type UnderlineOptions } from "./extensions/underline";
import { Code, type CodeOptions } from "./extensions/code";
import { Link, type LinkOptions } from "./extensions/link";
import { HighlightMark } from "./extensions/highlight";
import { Subscript, type SubscriptOptions } from "./extensions/subscript";
import { Superscript, type SuperscriptOptions } from "./extensions/superscript";

// Base extensions
import { AutoFocus } from "./extensions/base/auto-focus";
import { CustomKeys } from "./extensions/base/custom-keys";

// Table extensions
import { Table, TableCell, TableHeader, TableRow, type TableCellOptions, type TableHeaderOptions } from "./extensions/nodes/table";

// CodeBlock extension
import { CodeBlock, type CodeBlockOptions } from "./extensions/nodes/code-block";

// ImageBlock extension
import { ImageBlock, type ImageBlockOptions } from "./extensions/nodes/image-block";

// Comment and Mention extensions
import { CommentMark, type CommentMarkOptions } from "./extensions/comment-mark";
import { Mention, type MentionOptions, MentionPluginKey } from "./extensions/mention";

// Emoji extension
import { EmojiNode } from "./extensions/nodes/emoji";

// Re-export all node extensions and their types
export { Document, Heading, Paragraph, Text, Blockquote, HorizontalRule, HardBreak };
export { BulletList, OrderedList, ListItem, TaskList, TaskItem };
export { Table, TableCell, TableHeader, TableRow };
export { CodeBlock };
export { ImageBlock };
export type { HeadingOptions, ParagraphOptions, HardBreakOptions };
export type { BulletListOptions, OrderedListOptions, ListItemOptions, TaskListOptions, TaskItemOptions };
export type { TableCellOptions, TableHeaderOptions };
export type { CodeBlockOptions };
export type { ImageBlockOptions };

// Re-export all mark extensions and their types
export { Bold, Italic, Strike, Underline, Code, Link, HighlightMark, Subscript, Superscript };
export type { ItalicOptions, StrikeOptions, UnderlineOptions, CodeOptions, LinkOptions, SubscriptOptions, SuperscriptOptions };

// Re-export comment and mention extensions
export { CommentMark, Mention, MentionPluginKey };
export type { CommentMarkOptions, MentionOptions };

// Re-export emoji extension
export { EmojiNode };

// Re-export base extensions
export { AutoFocus, CustomKeys };

// Markdown extension and types
export { Markdown, type MarkdownOptions, type MarkdownStorage } from "./markdown";
export type { NodeMarkdownStorage, MarkMarkdownStorage, MarkdownNode, Attrs } from "./markdown/types";

// Additional markdown types
export type { ParserState, SerializerState } from "./markdown";

// Table utilities
export * from "./extensions/nodes/table/utils";

/**
 * Core extension collection
 * Includes all core nodes and marks for basic document editing
 */
export const coreExtensions = [
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

  // CodeBlock extension
  CodeBlock,

  // ImageBlock extension
  ImageBlock,

  // Comment mark
  CommentMark,

  // Emoji extension
  EmojiNode,

  // Base extensions
  AutoFocus,
  CustomKeys,
];
