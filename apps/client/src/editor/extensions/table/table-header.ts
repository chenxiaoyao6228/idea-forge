import TiptapTableHeader from "@tiptap/extension-table-header";
import { createTableDecorationPlugin } from "./plugins/create-table-decoration-plugin";

export const TableHeader = TiptapTableHeader.extend({
  addAttributes() {
    return {
      // Preserve parent's attributes (for safety)
      ...this.parent?.(),
      colspan: {
        default: 1,
      },
      rowspan: {
        default: 1,
      },
      colwidth: {
        default: null,
        parseHTML: (element) => {
          const colwidth = element.getAttribute("colwidth");
          const value = colwidth ? colwidth.split(",").map((item) => Number.parseInt(item, 10)) : null;

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
          match: (node) => node.type === "tableCell" && !!node.isHeader,
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
      clickMenu: {
        hide: true,
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      createTableDecorationPlugin({
        editor: this.editor,
        type: "column",
      }),
    ];
  },
});
