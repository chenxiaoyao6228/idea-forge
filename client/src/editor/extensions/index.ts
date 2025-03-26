import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import TextAlign from "@tiptap/extension-text-align";
import { Dropcursor } from "@tiptap/extension-dropcursor";
import Focus from "@tiptap/extension-focus";
import UniqueID from "@tiptap-pro/extension-unique-id";

// custom extensions
import { HardBreak } from "./hard-break";
import Document from "./document";
import HorizontalRule from "./horizontal-rule";
import { Blockquote } from "./block-quote";
import { Paragraph } from "./paragraph";
import { Text } from "./text";
import { Heading } from "./heading";
import { Bold } from "./bold";
import { Italic } from "./italic";
import { Strike } from "./strike";
import { Underline } from "./underline";
import { Subscript } from "./sub";
import { Superscript } from "./sup";
import { BulletList } from "./bullet-list";
import { ListItem } from "./list-item";
import { OrderedList } from "./ordered-list";
import { TaskList } from "./task-list";
import { TaskItem } from "./task-item";
import { Markdown } from "./markdown";
import { Link } from "./link";
import { CustomKeys } from "./custom-keys";
import { SlashCommands } from "./slash-commands";
import { CodeBlock } from "./code-block";
import { Code } from "./code";
import ImageBlock from "./image-block";
import { Selection } from "./selection";
import { Table, TableCell, TableHeader, TableRow } from "./table";
import AddParagraph from "./paragraph/plugins/add-paragraph";
import { AutoFocus } from "./auto-fucus";
import { HighlightMark } from "./highlight-marker";

const nodes = [
  Document,
  Heading,
  Paragraph,
  Text,
  Blockquote,
  BulletList,
  ListItem,
  OrderedList,
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
  HardBreak,
  HorizontalRule,
  Code.configure({
    HTMLAttributes: {
      class: "rounded-md bg-gray-700 dark:bg-gray-200 px-1.5 py-1 font-mono font-medium",
      spellcheck: "false",
    },
  }),
  CodeBlock,
  ImageBlock,
  Table.configure({
    resizable: true,
    lastColumnResizable: false,
  }),
  TableCell,
  TableRow,
  TableHeader,
];

const marks = [
  Bold,
  Italic,
  Strike,
  Underline,
  Subscript,
  Superscript,
  Link.configure({
    openOnClick: false,
  }),
  HighlightMark,
];

const _extensions = [
  Markdown,
  Typography,
  TextAlign.configure({
    types: ["heading", "paragraph"],
  }),
  Placeholder.configure({ placeholder: "Type / to set format, or type a space to use AI" }),
  CustomKeys,
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
  AutoFocus,
  UniqueID.configure({
    attributeName: "id",
    types: ["heading", "paragraph", "blockQuote", "code", "codeBlock", "link", "tableCell", "tableRow", "tableHeader", "listItem"],
  }),
];

export const extensions = [...nodes, ...marks, ..._extensions];
