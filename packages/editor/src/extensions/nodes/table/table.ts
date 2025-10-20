import { Table as TiptapTable } from "@tiptap/extension-table";
import type { NodeMarkdownStorage } from "../../../markdown/types";

export const Table = TiptapTable.extend({
  name: "table",
  addStorage() {
    return {
      markdown: {
        parser: {
          match: (node) => node.type === "table",
          apply: (state, node, type) => {
            state.openNode(type);
            state.next(node.children);
            state.closeNode();
          },
        },
        serializer: {
          match: (node) => node.type.name === this.name,
          apply: (state, node) => {
            state.openNode({ type: "table" });
            state.next(node.content);
            state.closeNode();
          },
        },
      },
    } satisfies NodeMarkdownStorage;
  },
});
