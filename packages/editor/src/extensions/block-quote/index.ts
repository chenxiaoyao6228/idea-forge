import { Blockquote as IBlockquote, BlockquoteOptions as TBlockquoteOptions } from "@tiptap/extension-blockquote";
import { NodeMarkdownStorage } from "../../markdown/types";

export const Blockquote = IBlockquote.extend({
  name: "blockquote",
  addAttributes() {
    return {
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
          match: (node) => node.type === "blockquote",
          apply: (state, node, type) => {
            console.log("blockquote parser", node);
            state.openNode(type);
            state.next(node.children);
            state.closeNode();
          },
        },
        serializer: {
          match: (node) => node.type.name === this.name,
          apply: (state, node) => {
            console.log("blockquote serializer", node);
            state.openNode({ type: "blockquote" });
            state.next(node.content);
            state.closeNode();
          },
        },
      },
    } satisfies NodeMarkdownStorage;
  },
});
