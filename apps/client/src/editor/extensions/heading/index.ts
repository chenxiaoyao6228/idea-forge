import { Heading as THeading, type HeadingOptions as THeadingOptions } from "@tiptap/extension-heading";
import type { NodeMarkdownStorage } from "../markdown/types";

export interface HeadingOptions extends THeadingOptions {
  dictionary: {
    name: string;
  };
}

export const Heading = THeading.extend<HeadingOptions>({
  name: "heading",
  addOptions() {
    return {
      HTMLAttributes: {},
      levels: [1, 2, 3, 4, 5, 6],
      dictionary: {
        name: "Heading",
      },
    };
  },
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
          match: (node) => node.type === "heading",
          apply: (state, node, type) => {
            const depth = node.depth as number;
            state.openNode(type, { level: depth });
            state.next(node.children);
            state.closeNode();
          },
        },
        serializer: {
          match: (node) => node.type.name === this.name,
          apply: (state, node) => {
            state.openNode({
              type: "heading",
              depth: node.attrs.level,
            });
            state.next(node.content);
            state.closeNode();
          },
        },
      },
    } satisfies NodeMarkdownStorage;
  },
});
