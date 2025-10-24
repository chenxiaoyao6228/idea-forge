import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect } from "react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { cn } from "@idea/ui/shadcn/utils";

interface CommentEditorProps {
  value: any;
  onChange?: (value: any) => void;
  placeholder?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onSubmit?: () => void;
}

export function CommentEditor({
  value,
  onChange,
  placeholder = "Write a comment...",
  readOnly = false,
  autoFocus = false,
  onFocus,
  onBlur,
  onSubmit,
}: CommentEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // Disable headings in comments
        codeBlock: false, // Disable code blocks
      }),
      Link.configure({
        openOnClick: readOnly,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editable: !readOnly,
    autofocus: autoFocus,
    onUpdate: ({ editor }) => {
      if (!readOnly && onChange) {
        onChange(editor.getJSON());
      }
    },
    onFocus: () => {
      onFocus?.();
    },
    onBlur: () => {
      onBlur?.();
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none p-2",
          readOnly ? "cursor-default" : "min-h-[60px]",
          "prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 ",
          "prose-p:mx-0.5 prose-ul:mx-0.5 prose-ol:mx-0.5 prose-li:mx-0.5 prose-headings:mx-0.5 prose-blockquote:mx-0.5 prose-code:mx-0.5 prose-pre:mx-0.5 prose-strong:mx-0.5 prose-em:mx-0.5 prose-a:mx-0.5",
        ),
      },
      handleKeyDown: (_view, event) => {
        // Handle Enter key for submission
        if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey && !readOnly) {
          event.preventDefault();
          onSubmit?.();
          return true;
        }
        return false;
      },
    },
  });

  // Sync editor content when value prop changes
  useEffect(() => {
    if (editor && !readOnly) {
      const currentContent = editor.getJSON();
      // Only update if the content is actually different to avoid cursor issues
      if (JSON.stringify(currentContent) !== JSON.stringify(value)) {
        editor.commands.setContent(value || "");
      }
    }
  }, [editor, value, readOnly]);

  return (
    <div className={cn("comment-editor", readOnly && "cursor-default")}>
      <EditorContent editor={editor} />
    </div>
  );
}
