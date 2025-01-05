import { History } from "@tiptap/extension-history";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";

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
];

const marks = [Bold, Italic, Strike, Underline, Subscript, Superscript];

const _extensions = [Typography, Placeholder.configure({ placeholder: "Write something..." }), Markdown, History];

export const extensions = [...nodes, ...marks, ..._extensions];
