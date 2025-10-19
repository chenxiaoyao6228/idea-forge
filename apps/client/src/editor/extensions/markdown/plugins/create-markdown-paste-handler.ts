import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/core";

/**
 * Checks if content looks like plain code (not markdown code blocks)
 * This prevents the markdown handler from interfering with the code block paste handler
 */
function isPlainCode(text: string): boolean {
  const lines = text.split("\n");

  // Check for VS Code metadata
  // Note: This is a fallback check - the main check happens in the code block handler

  // Check if it's a fenced code block (which IS markdown)
  if (/^```/.test(text)) {
    return false;
  }

  // Check for consistent indentation without markdown markers
  const indentedLines = lines.filter((line) => line.match(/^[ \t]+/) && line.trim().length > 0);
  const hasConsistentIndentation = indentedLines.length >= Math.min(3, lines.length * 0.5);

  // Check for code patterns
  const codePatterns = [/^(import|export|const|let|var|function|class|interface|type|enum)\s+/m, /[{};()[\]]/, /=>/, /\/\*|\*\/|\/\//];

  const hasCodePatterns = codePatterns.some((pattern) => pattern.test(text));

  // If it has both indentation and code patterns, it's likely plain code
  // that should be handled by the code block handler
  return hasConsistentIndentation && hasCodePatterns;
}

export function createMarkdownPasteHandler(editor: Editor) {
  return new Plugin({
    key: new PluginKey("markdownPasteHandler"),
    props: {
      handlePaste: (view, event) => {
        try {
          if (!event.clipboardData) return false;

          const markdownContent = event.clipboardData.getData("text/plain");

          if (!markdownContent) return false;

          // Skip if this looks like plain code (let the code block handler deal with it)
          if (isPlainCode(markdownContent)) {
            return false;
          }

          const markdownPatterns = {
            headers: /^#{1,6}\s+/m,
            lists: /^[-*+]\s+|^\d+\.\s+/m,
            codeBlocks: /^```/m, // Only fenced code blocks, not indented ones
            blockquotes: /^>\s+/m,
            emphasis: /[*_]{1,2}[^*_]+[*_]{1,2}/,
            links: /\[([^\]]+)\]\(([^)]+)\)/,
            tables: /\|.*\|.*\n\|[-:|\s]+\|/,
            images: /!\[(.*?)\]\(([^)]+)\)/,
            code: /`[^`]+`/,
            bold: /\*\*[^**]+\*\*/,
            italic: /\*[^*]+/,
            strikethrough: /~~[^~]+~~/,
            codeBlock: /^```[^`]+```/,
            blockquote: /^>.*$/,
            list: /^[*-] .*$/,
          };

          const isMarkdown = Object.values(markdownPatterns).some((pattern) => pattern.test(markdownContent));

          if (!isMarkdown) return false;

          const { tr } = view.state;
          const { empty, from, to } = view.state.selection;

          if (empty && !editor.can().insertContent(markdownContent)) {
            return false;
          }

          const doc = editor.storage.markdown.parse(markdownContent);
          if (!doc || doc.content.size === 0) return false;

          tr.replaceWith(from, to, doc).setMeta("paste", true).setMeta("preventUpdate", false);

          view.dispatch(tr);

          return true;
        } catch (error) {
          console.error("Markdown paste handler error:", error);
          //   editor.emit("markdownPasteError", {
          //     error,
          //     content: event.clipboardData?.getData("text/plain"),
          //   });
          return false;
        }
      },
    },
  });
}
