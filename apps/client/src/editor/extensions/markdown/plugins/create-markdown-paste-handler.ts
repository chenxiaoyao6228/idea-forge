import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/core";

export function createMarkdownPasteHandler(editor: Editor) {
  return new Plugin({
    key: new PluginKey("markdownPasteHandler"),
    props: {
      handlePaste: (view, event) => {
        try {
          if (!event.clipboardData) return false;

          const markdownContent = event.clipboardData.getData("text/plain");

          if (!markdownContent) return false;

          const markdownPatterns = {
            headers: /^#{1,6}\s+/m,
            lists: /^[-*+]\s+|^\d+\.\s+/m,
            codeBlocks: /^```|^\s{4,}/m,
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
