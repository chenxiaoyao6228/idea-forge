import "./index.css";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { useEffect } from "react";
import Typography from "@tiptap/extension-typography";
import TextAlign from "@tiptap/extension-text-align";
import { Dropcursor } from "@tiptap/extension-dropcursor";
import Focus from "@tiptap/extension-focus";
import UniqueID from "@tiptap/extension-unique-id";
import TableOfContents, { type TableOfContentDataItem } from "@tiptap/extension-table-of-contents";

// Import base extensions (nodes and marks)
import { HardBreak } from "./extensions/hard-break";
import Document from "./extensions/document";
import HorizontalRule from "./extensions/horizontal-rule";
import { Blockquote } from "./extensions/block-quote";
import { Paragraph } from "./extensions/paragraph";
import { Text } from "./extensions/text";
import { Heading } from "./extensions/heading";
import { Bold } from "./extensions/bold";
import { Italic } from "./extensions/italic";
import { Strike } from "./extensions/strike";
import { Underline } from "./extensions/underline";
import { Subscript } from "./extensions/sub";
import { Superscript } from "./extensions/sup";
import { BulletList } from "./extensions/bullet-list";
import { ListItem } from "./extensions/list-item";
import { OrderedList } from "./extensions/ordered-list";
import { TaskList } from "./extensions/task-list";
import { TaskItem } from "./extensions/task-item";
import { Markdown } from "./extensions/markdown";
import { Link } from "./extensions/link";
import { CodeBlock } from "./extensions/code-block";
import { Code } from "./extensions/code";
import ImageBlock from "./extensions/image-block";
import { Selection } from "./extensions/selection";
import { Table, TableCell, TableHeader, TableRow } from "./extensions/table";
import { HighlightMark } from "./extensions/highlight-marker";

interface ReadOnlyEditorProps {
  content: string | object;
  className?: string;
  onTocUpdate?: (items: TableOfContentDataItem[]) => void;
  onEditorReady?: (editor: Editor) => void;
}

/**
 * Read-only TipTap editor for public document viewing
 */
export default function ReadOnlyEditor({ content, className, onTocUpdate, onEditorReady }: ReadOnlyEditorProps) {
  // Parse content if it's a string
  const parsedContent =
    typeof content === "string"
      ? (() => {
          try {
            return JSON.parse(content);
          } catch {
            // If it's not valid JSON, treat it as plain text
            return {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: content }],
                },
              ],
            };
          }
        })()
      : content;

  const editor = useEditor(
    {
      editorProps: {
        attributes: {
          class: "min-h-96 prose dark:prose-invert focus:outline-none max-w-none",
        },
      },
      editable: false, // Read-only mode for security (FR-033)
      extensions: [
        // Nodes
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
          resizable: false, // Disable resizing in read-only mode
          lastColumnResizable: false,
        }),
        TableCell,
        TableRow,
        TableHeader,

        // Marks
        Bold,
        Italic,
        Strike,
        Underline,
        Subscript,
        Superscript,
        Link.configure({
          openOnClick: true, // Allow clicking links in read-only mode
        }),
        HighlightMark,

        // Extensions (minimal set for read-only)
        Markdown,
        Typography,
        TextAlign.configure({
          types: ["heading", "paragraph"],
        }),
        Dropcursor.configure({
          width: 2,
          class: "ProseMirror-dropcursor border-black",
        }),
        Focus.configure({
          className: "has-focus",
          mode: "all",
        }),
        Selection,
        UniqueID.configure({
          attributeName: "id",
          types: ["heading", "paragraph", "blockQuote", "code", "codeBlock", "link", "tableCell", "tableRow", "tableHeader", "listItem"],
        }),
        TableOfContents.configure({
          scrollParent: () => document.getElementById("PUBLIC_DOC_SCROLL_CONTAINER") || window,
          onUpdate: onTocUpdate,
        }),
      ],
      content: parsedContent,
    },
    [content], // Only recreate editor when content prop changes
  );

  // Call onEditorReady callback when editor is initialized
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  useEffect(() => {
    return () => {
      if (editor && !editor.isDestroyed) {
        editor.destroy();
      }
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={className}>
      <EditorContent editor={editor} className="w-full" />
    </div>
  );
}
