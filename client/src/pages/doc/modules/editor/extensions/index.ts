import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import TextAlign from "@tiptap/extension-text-align";

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
];

const _extensions = [
  Markdown,
  Typography,
  TextAlign.configure({
    types: ["heading", "paragraph"],
  }),
  Placeholder.configure({ placeholder: "Write something..." }),
  CustomKeys,
  SlashCommands,
];

export const extensions = [...nodes, ...marks, ..._extensions];
