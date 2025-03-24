import TiptapTableRow from "@tiptap/extension-table-row";

export const TableRow = TiptapTableRow.extend({
  name: "tableRow",
  content: "tableCell*",

  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        parser: {
          match: (node) => node.type === "tableRow",
          apply: (state, node, type) => {
            state.openNode(type);
            if (node.children) {
              state.next(node.children.map((a, i) => ({ ...a, align: node.align?.[i], isHeader: node.isHeader })));
            }
            state.closeNode();
          },
        },
        serializer: {
          match: (node) => node.type.name === this.name,
          apply: (state, node) => {
            state.openNode({ type: "tableRow" });
            state.next(node.content);
            state.closeNode();
          },
        },
      },
    };
  },
});
