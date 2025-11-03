import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useMemo } from "react";
import type { AnyExtension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { cn } from "@idea/ui/shadcn/utils";
import { Mention, MentionPluginKey } from "@idea/editor";
import { createMentionSuggestionRenderer } from "./mention-suggestion";
import { userApi } from "@/apis/user";

interface CommentEditorProps {
  value: any;
  onChange?: (value: any) => void;
  placeholder?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onSubmit?: () => void;
  onEditorReady?: (editor: any) => void;
  documentId?: string; // Required for mention suggestions
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
  onEditorReady,
  documentId,
}: CommentEditorProps) {
  // Memoize extensions to prevent recreation on every render
  const extensions = useMemo(() => {
    const baseExtensions: AnyExtension[] = [
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
    ];

    // Add mention support if documentId is available
    if (documentId) {
      const renderer = createMentionSuggestionRenderer();

      baseExtensions.push(
        Mention.configure({
          HTMLAttributes: {
            class: "mention",
          },
          suggestion: {
            char: "@",
            items: async ({ query }: { query: string }) => {
              try {
                const response = await userApi.suggestMentionUsers({
                  documentId,
                  query: query || undefined,
                });

                return response.users;
              } catch (error) {
                console.error("Error fetching mention suggestions:", error);
                return [];
              }
            },
            render: () => renderer,
          },
        }),
      );
    }

    return baseExtensions;
  }, [documentId, readOnly, placeholder]);

  const editor = useEditor(
    {
      extensions,
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
        handleKeyDown: (view, event) => {
          // Check if mention suggestion is active
          const mentionSuggestionActive = MentionPluginKey.getState(view.state);

          // Don't handle Enter if mention suggestion is active (let the suggestion handle it)
          if (mentionSuggestionActive?.active) {
            return false;
          }

          // Handle Enter key for submission
          if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey && !readOnly) {
            event.preventDefault();
            onSubmit?.();
            return true;
          }
          return false;
        },
      },
    },
    [extensions, autoFocus],
  );

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

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
    <div className={cn(readOnly && "cursor-default")}>
      <EditorContent editor={editor} className="comment-editor" />
    </div>
  );
}
