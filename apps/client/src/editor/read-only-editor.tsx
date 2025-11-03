import "./index.css";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { useEffect } from "react";
import Typography from "@tiptap/extension-typography";
import TextAlign from "@tiptap/extension-text-align";
import { Dropcursor } from "@tiptap/extension-dropcursor";
import Focus from "@tiptap/extension-focus";
import UniqueID from "@tiptap/extension-unique-id";
import TableOfContents, { type TableOfContentDataItem } from "@tiptap/extension-table-of-contents";

// Import core extensions from shared package
import { coreExtensions, Code, TaskItem, Link, Markdown, Table } from "@idea/editor";

// Import client-specific extensions
import { Selection } from "./extensions/selection";

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

  // Configure core extensions for read-only mode
  const configuredCoreExtensions = coreExtensions.map((ext) => {
    // Configure Code with custom styling
    if (ext.name === "code") {
      return Code.configure({
        HTMLAttributes: {
          class: "rounded-md bg-gray-700 dark:bg-gray-200 px-1.5 py-1 font-mono font-medium",
          spellcheck: "false",
        },
      });
    }
    // Configure TaskItem with nesting
    if (ext.name === "taskItem") {
      return TaskItem.configure({
        nested: true,
      });
    }
    // Configure Link to allow clicking in read-only mode
    if (ext.name === "link") {
      return Link.configure({
        openOnClick: true,
      });
    }
    // Configure Table to disable resizing in read-only mode
    if (ext.name === "table") {
      return Table.configure({
        resizable: false,
        lastColumnResizable: false,
      });
    }
    return ext;
  });

  const editor = useEditor(
    {
      editorProps: {
        attributes: {
          class: "min-h-96 prose dark:prose-invert focus:outline-none max-w-none",
        },
      },
      editable: false, // Read-only mode for security (FR-033)
      extensions: [
        // Core extensions from @idea/editor
        ...configuredCoreExtensions,

        // Markdown support
        Markdown,

        // Additional TipTap extensions for read-only viewing
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

        // Client-specific extensions
        Selection,

        // Utility extensions
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
