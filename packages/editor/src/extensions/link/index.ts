import { Link as TLink, type LinkOptions as TLinkOptions } from "@tiptap/extension-link";
import type { MarkMarkdownStorage } from "../../markdown/types";

export interface LinkOptions extends TLinkOptions {}

export const Link = TLink.extend<LinkOptions>({
  name: "link",
  addKeyboardShortcuts() {
    return {
      "Mod-k": () => {
        return this.editor
          .chain()
          .toggleLink({ href: "" })
          .setTextSelection(this.editor.state.selection.to - 1)
          .run();
      },
    };
  },
  addAttributes() {
    return {
      // Preserve parent's attributes (including href, target, rel, etc.)
      ...this.parent?.(),
      // Add custom id attribute
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("id"),
        renderHTML: (attributes) => ({
          "data-node-id": attributes.id,
          id: attributes.id,
        }),
      },
    };
  },
  addStorage() {
    return {
      markdown: {
        parser: {
          match: (node) => node.type === "link",
          apply: (state, node, type) => {
            const url = node.url as string;
            const title = node.title as string;
            state.openMark(type, { href: url, title });
            state.next(node.children);
            state.closeMark(type);
          },
        },
        serializer: {
          match: (mark) => mark.type.name === this.name,
          apply: (state, mark) => {
            state.withMark(mark, {
              type: "link",
              title: mark.attrs.title,
              url: mark.attrs.href,
            });
          },
        },
      },
    } satisfies MarkMarkdownStorage;
  },
});
