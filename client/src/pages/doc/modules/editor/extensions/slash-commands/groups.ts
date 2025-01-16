import { Heading1, Heading2, Heading3, List, ListOrdered, ListTodo, Quote, Minus, Link, SquareCode, Sprout, Image, Table } from "lucide-react";
import type { CommandGroup } from "./types";

export const commandGroups: CommandGroup[] = [
  {
    name: "block",
    title: "Basic Block",
    commands: [
      {
        name: "heading1",
        label: "Heading 1",
        description: "Large section heading",
        Icon: Heading1,
        aliases: ["h1"],
        command: ({ editor }) => {
          editor.chain().focus().setHeading({ level: 1 }).run();
        },
      },
      {
        name: "heading2",
        label: "Heading 2",
        description: "Medium section heading",
        Icon: Heading2,
        aliases: ["h2"],
        command: ({ editor }) => {
          editor.chain().focus().setHeading({ level: 2 }).run();
        },
      },
      {
        name: "heading3",
        label: "Heading 3",
        description: "Small section heading",
        Icon: Heading3,
        aliases: ["h3"],
        command: ({ editor }) => {
          editor.chain().focus().setHeading({ level: 3 }).run();
        },
      },
      {
        name: "bulletList",
        label: "Bullet List",
        description: "Create a simple bullet list",
        Icon: List,
        aliases: ["ul"],
        command: ({ editor }) => {
          editor.chain().focus().toggleBulletList().run();
        },
      },
      {
        name: "orderedList",
        label: "Numbered List",
        description: "Create a numbered list",
        Icon: ListOrdered,
        aliases: ["ol"],
        command: ({ editor }) => {
          editor.chain().focus().toggleOrderedList().run();
        },
      },
      {
        name: "taskList",
        label: "Task List",
        description: "Create a task list",
        Icon: ListTodo,
        aliases: ["todo"],
        command: ({ editor }) => {
          editor.chain().focus().toggleTaskList().run();
        },
      },
      {
        name: "blockquote",
        label: "Quote",
        description: "Add a quote block",
        Icon: Quote,
        command: ({ editor }) => {
          editor.chain().focus().setBlockquote().run();
        },
      },

      {
        name: "image",
        label: "Image",
        Icon: Image,
        description: "Insert an image",
        aliases: ["img"],
        command: ({ editor }) => {
          editor.chain().focus().insertLocalImage().run();
        },
      },
      {
        name: "mermaid",
        label: "Mermaid Diagram",
        Icon: Sprout,
        description: "Insert a Mermaid diagram",
        command: ({ editor }) => {
          editor.chain().focus().setCodeBlock({ language: "mermaid" }).run();
        },
      },
      {
        name: "codeBlock",
        label: "CodeBlock ",
        Icon: SquareCode,
        aliases: ["code"],
        description: "Code block with syntax highlighting",
        command: ({ editor }) => {
          editor.chain().focus().setCodeBlock().run();
        },
      },

      {
        name: "table",
        label: "Table",
        Icon: Table,
        description: "Insert a table",
        command: ({ editor }) => {
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run();
        },
      },

      {
        name: "horizontalRule",
        label: "Horizontal Line",
        description: "Add a horizontal divider",
        Icon: Minus,
        aliases: ["hr"],
        command: ({ editor }) => {
          editor.chain().focus().setHorizontalRule().run();
        },
      },
      {
        name: "link",
        label: "Link",
        description: "Add a link",
        Icon: Link,
        command: ({ editor }) => {
          editor.chain().focus().setLink({ href: "" }).run();
        },
      },
    ],
  },
];
