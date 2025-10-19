import { OrderedList as TOrderedList, type OrderedListOptions as TOrderedListOptions } from "@tiptap/extension-ordered-list";
import type { NodeMarkdownStorage } from "../markdown/types";

export interface OrderedListOptions extends TOrderedListOptions {
  dictionary: {
    name: string;
  };
}

export const OrderedList = TOrderedList.extend<OrderedListOptions>({
  name: "orderedList",
  addOptions() {
    return {
      HTMLAttributes: {},
      itemTypeName: "listItem",
      keepMarks: false,
      keepAttributes: false,
      dictionary: {
        name: "Ordered List",
      },
    };
  },
  addStorage() {
    return {
      markdown: {
        parser: {
          match: (node) => node.type === "list" && !!node.ordered,
          apply: (state, node, type) => {
            state.openNode(type);
            state.next(node.children);
            state.closeNode();
          },
        },
        serializer: {
          match: (node) => node.type.name === this.name,
          apply: (state, node) => {
            state.openNode({
              type: "list",
              ordered: true,
              start: 1,
            });
            state.next(node.content);
            state.closeNode();
          },
        },
      },
    } satisfies NodeMarkdownStorage;
  },
});
