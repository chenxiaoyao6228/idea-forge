import { mergeAttributes, Node } from "@tiptap/core";
import { createTableDecorationPlugin } from "./plugins/create-table-decoration-plugin";

export interface TableCellOptions {
  HTMLAttributes: Record<string, any>;
}

export const TableCell = Node.create<TableCellOptions>({
  name: "tableCell",
  content: "block+", // Do not allow table in table
  tableRole: "cell",
  isolating: true,
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },
  parseHTML() {
    return [{ tag: "td" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["td", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
  addAttributes() {
    return {
      colspan: {
        default: 1,
        parseHTML: (element) => {
          const colspan = element.getAttribute("colspan");
          const value = colspan ? Number.parseInt(colspan, 10) : 1;

          return value;
        },
      },
      rowspan: {
        default: 1,
        parseHTML: (element) => {
          const rowspan = element.getAttribute("rowspan");
          const value = rowspan ? Number.parseInt(rowspan, 10) : 1;

          return value;
        },
      },
      colwidth: {
        default: null,
        parseHTML: (element) => {
          const colwidth = element.getAttribute("colwidth");
          const value = colwidth ? [Number.parseInt(colwidth, 10)] : null;

          return value;
        },
      },
      style: {
        default: null,
      },
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
      ...this.parent?.(),
      markdown: {
        parser: {
          match: (node) => node.type === "tableCell" && !node.isHeader,
          apply: (state, node, type) => {
            state.openNode(type, { alignment: node.align });
            state.openNode(state.editor.schema.nodes.paragraph);
            state.next(node.children);
            state.closeNode();
            state.closeNode();
          },
        },
        serializer: {
          match: (node) => node.type.name === this.name,
          apply: (state, node) => {
            state.openNode({ type: "tableCell" });
            state.next(node.content);
            state.closeNode();
          },
        },
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      createTableDecorationPlugin({
        editor: this.editor,
        type: "row",
      }),
    ];
  },
});
