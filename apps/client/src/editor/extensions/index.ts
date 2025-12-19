import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import TextAlign from "@tiptap/extension-text-align";
import { Dropcursor } from "@tiptap/extension-dropcursor";
import Focus from "@tiptap/extension-focus";
import { UniqueID } from "@tiptap/extension-unique-id";
import { isChangeOrigin } from "@tiptap/extension-collaboration";

// Shared editor package - includes all core nodes, marks, and base extensions
import { coreExtensions, Code, TaskItem, Markdown, Table, TableCell, TableHeader, TableRow, EmojiNode, MathExtension } from "@idea/editor";

// Client-specific extensions
import { SlashCommands } from "./slash-commands";
import { Selection } from "./selection";
import { CodeBlock } from "./code-block";
import ImageBlock from "./image-block";
import { createTableDecorationPlugin } from "./table/plugins/create-table-decoration-plugin";
import AddParagraph from "./paragraph/plugins/add-paragraph";
import { emojiSuggestion } from "./emoji/suggestion";
import i18next from "i18next";

// Configure specific extensions from coreExtensions
// Filter out extensions that need client-specific configuration below
const configuredCoreExtensions = coreExtensions
  .filter(
    (ext) =>
      ![
        // Table extensions - reconfigured below
        "table",
        "tableCell",
        "tableRow",
        "tableHeader",
        // Emoji - reconfigured with suggestion below
        "emoji",
        // Math extensions - reconfigured below (MathExtension adds these)
        "inlineMath",
        "blockMath",
        "Mathematics",
        // Code extensions - using custom CodeBlock
        "code",
        "codeBlock",
        // Task extensions
        "taskItem",
        "taskList",
        // ImageBlock - using custom ImageBlock
        "imageBlock",
        // CommentMark - configured in editor/index.tsx
        "commentMark",
      ].includes(ext.name),
  )
  .map((ext) => ext);

const nodes = [
  ...configuredCoreExtensions,
  CodeBlock,
  ImageBlock,
  // Emoji extension with suggestion
  EmojiNode.configure({
    enableEmoticons: true,
    HTMLAttributes: {
      class: "emoji-node inline-block",
    },
    // @ts-ignore - suggestion is a valid option from TipTap Emoji extension
    suggestion: emojiSuggestion,
  }),
  MathExtension.configure({
    katexOptions: {
      throwOnError: false,
      output: "html",
    },
  }),
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
  // Official UniqueID extension with collaboration support
  // filterTransaction: Skip ID generation for remote Yjs changes to prevent empty paragraphs
  // See: https://github.com/ueberdosis/tiptap/issues/2400
  UniqueID.configure({
    attributeName: "id",
    types: ["heading", "paragraph", "blockQuote", "code", "codeBlock", "link", "tableCell", "tableRow", "tableHeader", "listItem"],
    filterTransaction: (transaction) => !isChangeOrigin(transaction),
  }),

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
];

export const extensions = [...nodes, ...marks, ..._extensions];
