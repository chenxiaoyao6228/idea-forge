import { HardBreak as THardBreak, type HardBreakOptions as THardBreakOptions } from "@tiptap/extension-hard-break";
import type { NodeMarkdownStorage } from "../../markdown/types";

export interface HardBreakOptions extends THardBreakOptions {}

export const HardBreak = THardBreak.extend<HardBreakOptions>({
  name: "hardBreak",
  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        parser: {
          match: (node) => node.type === "break",
          apply: (state, _node, type) => {
            state.addNode(type);
          },
        },
        serializer: {
          match: (node) => node.type.name === this.name,
          apply: (state) => {
            state.addNode({
              type: "break",
            });
          },
        },
      },
    } satisfies NodeMarkdownStorage;
  },
});
