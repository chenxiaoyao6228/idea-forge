import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import TextAlign from "@tiptap/extension-text-align";
import { Dropcursor } from "@tiptap/extension-dropcursor";
import Focus from "@tiptap/extension-focus";
import UniqueID from "@tiptap/extension-unique-id";

// Shared editor package - includes all core nodes, marks, and base extensions
import { coreExtensions, Code, TaskItem, Markdown, Table, TableCell, TableHeader, TableRow } from "@idea/editor";

// Client-specific extensions
import { SlashCommands } from "./slash-commands";
import { Selection } from "./selection";
import { CodeBlock } from "./code-block";
import ImageBlock from "./image-block";
import { createTableDecorationPlugin } from "./table/plugins/create-table-decoration-plugin";
import AddParagraph from "./paragraph/plugins/add-paragraph";
import i18next from "i18next";

// Export CommentMark for dynamic configuration in editor
export { CommentMark } from "./comment-mark";

// Configure specific extensions from coreExtensions
// Filter out table extensions as they need client-specific configuration below
const configuredCoreExtensions = coreExtensions
  .filter((ext) => !["table", "tableCell", "tableRow", "tableHeader"].includes(ext.name))
  .map((ext) => {
    // Configure Code extension with custom styling
    if (ext.name === "code") {
      return Code.configure({
        HTMLAttributes: {
          class: "rounded-md bg-gray-700 dark:bg-gray-200 px-1.5 py-1 font-mono font-medium",
          spellcheck: "false",
        },
      });
    }
    // Configure TaskItem with nested option
    if (ext.name === "taskItem") {
      return TaskItem.configure({
        nested: true,
      });
    }
    return ext;
  });

const nodes = [
  ...configuredCoreExtensions,
  // Client-specific complex nodes
  CodeBlock,
  ImageBlock,
  // Table extensions with client-specific decorations
  Table.configure({
    resizable: true,
    lastColumnResizable: false,
  }),
  TableCell.configure({
    decorationPlugin: (editor) => createTableDecorationPlugin({ editor, type: "row" }),
  }),
  TableRow,
  TableHeader.configure({
    decorationPlugin: (editor) => createTableDecorationPlugin({ editor, type: "column" }),
  }),
];

// CommentMark needs to be configured dynamically with documentId and onCommentClick
// It's exported above and configured in editor/index.tsx
const marks: any[] = [];

const _extensions = [
  Markdown,
  Typography,
  TextAlign.configure({
    types: ["heading", "paragraph"],
  }),
  Placeholder.configure({ placeholder: i18next.t("Type / to set format, or type a space to use AI") }),
  SlashCommands,
  Dropcursor.configure({
    width: 2,
    class: "ProseMirror-dropcursor border-black",
  }),
  Focus.configure({
    className: "has-focus",
    mode: "all",
  }),
  Selection,
  AddParagraph,
  UniqueID.configure({
    attributeName: "id",
    types: ["heading", "paragraph", "blockQuote", "code", "codeBlock", "link", "tableCell", "tableRow", "tableHeader", "listItem"],
  }),
];

export const extensions = [...nodes, ...marks, ..._extensions];
