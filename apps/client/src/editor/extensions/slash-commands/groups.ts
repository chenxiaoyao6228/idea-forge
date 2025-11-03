import { Heading1, Heading2, Heading3, List, ListOrdered, ListTodo, Quote, Minus, Link, SquareCode, Sprout, Image, Table, Smile, Sigma } from "lucide-react";
import type { CommandGroup } from "./types";
import i18next from "i18next";

const { t } = i18next;

export const commandGroups: CommandGroup[] = [
  {
    name: "block",
    title: t("Basic Block"),
    commands: [
      {
        name: "heading1",
        label: t("Heading 1"),
        description: t("Large section heading"),
        Icon: Heading1,
        aliases: ["h1", "bt", "biaoti"],
        command: ({ editor }) => {
          editor.chain().focus().setHeading({ level: 1 }).run();
        },
      },
      {
        name: "heading2",
        label: t("Heading 2"),
        description: t("Medium section heading"),
        Icon: Heading2,
        aliases: ["h2", "bt2", "biaoti2"],
        command: ({ editor }) => {
          editor.chain().focus().setHeading({ level: 2 }).run();
        },
      },
      {
        name: "heading3",
        label: t("Heading 3"),
        description: t("Small section heading"),
        Icon: Heading3,
        aliases: ["h3", "bt3", "biaoti3"],
        command: ({ editor }) => {
          editor.chain().focus().setHeading({ level: 3 }).run();
        },
      },
      {
        name: "bulletList",
        label: t("Bullet List"),
        description: t("Create a simple bullet list"),
        Icon: List,
        aliases: ["ul", "lb", "liebiao", "wuxu", "wx"],
        command: ({ editor }) => {
          editor.chain().focus().toggleBulletList().run();
        },
      },
      {
        name: "orderedList",
        label: t("Numbered List"),
        description: t("Create a numbered list"),
        Icon: ListOrdered,
        aliases: ["ol", "szlb", "shuzi"],
        command: ({ editor }) => {
          editor.chain().focus().toggleOrderedList().run();
        },
      },
      {
        name: "taskList",
        label: t("Task List"),
        description: t("Create a task list"),
        Icon: ListTodo,
        aliases: ["todo", "dblb", "daiban"],
        command: ({ editor }) => {
          editor.chain().focus().toggleTaskList().run();
        },
      },
      {
        name: "blockquote",
        label: t("Quote"),
        description: t("Add a quote block"),
        Icon: Quote,
        aliases: ["yswz", "yinshuwenzi", "quote"],
        command: ({ editor }) => {
          editor.chain().focus().setBlockquote().run();
        },
      },
      {
        name: "image",
        label: t("Image"),
        Icon: Image,
        description: t("Insert an image"),
        aliases: ["img", "tp", "tupian", "image", "picture"],
        command: ({ editor }) => {
          editor.chain().focus().insertLocalImage().run();
        },
      },
      {
        name: "mermaid",
        label: t("Mermaid Diagram"),
        Icon: Sprout,
        description: t("Insert a Mermaid diagram"),
        command: ({ editor }) => {
          editor.chain().focus().setCodeBlock({ language: "mermaid" }).run();
        },
      },
      {
        name: "codeBlock",
        label: t("CodeBlock"),
        Icon: SquareCode,
        aliases: ["code", "dmpd", "daimapianduan"],
        description: t("Code block with syntax highlighting"),
        command: ({ editor }) => {
          editor.chain().focus().setCodeBlock({ language: "typescript" }).run();
        },
      },
      {
        name: "table",
        label: t("Table"),
        Icon: Table,
        description: t("Insert a table"),
        command: ({ editor }) => {
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run();
        },
      },
      {
        name: "horizontalRule",
        label: t("Horizontal Line"),
        description: t("Add a horizontal divider"),
        Icon: Minus,
        aliases: ["hr", "fgx", "fengexian"],
        command: ({ editor }) => {
          editor.chain().focus().setHorizontalRule().run();
        },
      },
      {
        name: "link",
        label: t("Link"),
        description: t("Add a link"),
        Icon: Link,
        command: ({ editor }) => {
          editor.chain().focus().setLink({ href: "" }).run();
        },
      },
      {
        name: "emoji",
        label: t("Emoji"),
        description: t("Insert an emoji"),
        Icon: Smile,
        aliases: ["biaoqing", "bq", "emoji", "emoticon"],
        command: ({ editor }) => {
          // Insert ':' to trigger emoji suggestion picker
          editor.chain().focus().insertContent(":").run();
        },
      },
      {
        name: "inlineMath",
        label: t("Inline Formula"),
        description: t("Insert an inline math formula (LaTeX)"),
        Icon: Sigma,
        aliases: ["math", "formula", "latex", "gongshi", "gs"],
        command: ({ editor }) => {
          const latex = prompt("Enter LaTeX formula:", "x^2 + y^2 = r^2");
          if (latex) {
            editor.chain().focus().insertInlineMath({ latex }).run();
          }
        },
      },
      {
        name: "blockMath",
        label: t("Block Formula"),
        description: t("Insert a block math formula (LaTeX)"),
        Icon: Sigma,
        aliases: ["mathblock", "formulablock", "latex", "gongshikuai", "gsk"],
        command: ({ editor }) => {
          const latex = prompt("Enter LaTeX formula:", "\\frac{a}{b} = \\frac{c}{d}");
          if (latex) {
            editor.chain().focus().insertBlockMath({ latex }).run();
          }
        },
      },
    ],
  },
];
