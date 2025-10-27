import { Heading as THeading, type HeadingOptions as THeadingOptions } from "@tiptap/extension-heading";
import type { Node as ProseMirrorNode, NodeType } from "@tiptap/pm/model";
import type { MarkdownNode, ParserState, SerializerState } from "../markdown";

export interface HeadingOptions extends THeadingOptions {
  dictionary?: {
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
      // Preserve parent's attributes (including level)
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
          match: (node: MarkdownNode) => node.type === "heading",
          apply: (state: ParserState, node: MarkdownNode, type: NodeType) => {
            const depth = node.depth as number;
            state.openNode(type, { level: depth });
            state.next(node.children);
            state.closeNode();
          },
        },
        serializer: {
          match: (node: ProseMirrorNode) => node.type.name === this.name,
          apply: (state: SerializerState, node: ProseMirrorNode) => {
            state.openNode({
              type: "heading",
              depth: node.attrs.level,
            });
            state.next(node.content);
            state.closeNode();
          },
        },
      },
    };
  },
});

export default Heading;
