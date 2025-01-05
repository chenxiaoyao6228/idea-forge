import { BulletList as TBulletList, type BulletListOptions as TBulletListOptions } from "@tiptap/extension-bullet-list";
import type { NodeMarkdownStorage } from "../markdown/types";

export interface BulletListOptions extends TBulletListOptions {}

export const BulletList = TBulletList.extend<BulletListOptions>({
  name: "bulletList",

  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        parser: {
          match: (node) => node.type === "list" && !node.ordered && !node.children?.find((item) => item.checked !== null),
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
              ordered: false,
            });
            state.next(node.content);
            state.closeNode();
          },
        },
      },
    };
  },
});
