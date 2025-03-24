import { Table as TiptapTable, TableOptions as TiptapTableOptions } from "@tiptap/extension-table";
import { MarkdownStorage } from "../markdown";

export const Table = TiptapTable.extend({
  name: "table",
  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        parser: {
          match: (node) => node.type === "table",
          apply: (state, node, type) => {
            state.openNode(type);
            if (node.children) {
              state.next(node.children.map((a, i) => ({ ...a, align: node.align[i], isHeader: i === 0 })));
            }
            state.closeNode();
          },
        },
        serializer: {
          match: (node) => node.type.name === this.name,
          apply: (state, node) => {
            const firstLine = node.content.firstChild?.content;
            if (!firstLine) {
              return;
            }
            const align: (string | null)[] = [];
            firstLine.forEach((cell) => align.push(cell.attrs.alignment));
            state.openNode({ type: "table", align });
            state.next(node.content);
            state.closeNode();
          },
        },
      },
    } satisfies MarkdownStorage;
  },
});
