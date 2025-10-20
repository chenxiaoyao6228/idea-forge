import { Paragraph as TParagraph, type ParagraphOptions as TParagraphOptions } from "@tiptap/extension-paragraph";
import type { Node as ProseMirrorNode, NodeType } from "@tiptap/pm/model";
import type { MarkdownNode, ParserState, SerializerState } from "../../markdown";

// eslint-disable-next-line ts/no-empty-object-type
export interface ParagraphOptions extends TParagraphOptions {}

export const Paragraph = TParagraph.extend<ParagraphOptions>({
  name: "paragraph",
  addAttributes() {
    return {
      // Preserve parent's attributes (for safety)
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
          match: (node: MarkdownNode) => node.type === "paragraph",
          apply: (state: ParserState, node: MarkdownNode, type: NodeType) => {
            state.openNode(type);
            if (node.children) {
              state.next(node.children);
            } else {
              state.addText(node.value);
            }
            state.closeNode();
          },
        },
        serializer: {
          match: (node: ProseMirrorNode) => node.type.name === this.name,
          apply: (state: SerializerState, node: ProseMirrorNode) => {
            state.openNode({ type: "paragraph" });
            if (node.type.name === "text") {
              state.addNode({
                type: "text",
                value: node.text,
              });
            } else {
              state.next(node.content);
            }
            state.closeNode();
          },
        },
      },
    };
  },
});
