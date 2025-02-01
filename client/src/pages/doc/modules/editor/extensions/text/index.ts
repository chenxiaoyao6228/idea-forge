import { Text as TText } from "@tiptap/extension-text";
import type { NodeMarkdownStorage } from "../markdown/types";

export const Text = TText.extend({
  name: "text",
  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        parser: {
          match: ({ type }) => type === "text",
          apply: (state, node) => {
            state.addText(node.value);
          },
        },
        serializer: {
          match: (node) => node.type.name === this.name,
          apply: (state, node) => {
            state.addNode({
              type: "text",
              value: node.text,
            });
          },
        },
      },
    } satisfies NodeMarkdownStorage;
  },
});
