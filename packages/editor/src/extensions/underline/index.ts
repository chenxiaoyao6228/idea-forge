import { Underline as TUnderline, type UnderlineOptions as TUnderlineOptions } from "@tiptap/extension-underline";
import type { MarkMarkdownStorage } from "../../markdown/types";
import { remarkDecoration } from "../../markdown/plugins/decoration";

export interface UnderlineOptions extends TUnderlineOptions {
  dictionary: {
    name: string;
  };
}

export const Underline = TUnderline.extend<UnderlineOptions>({
  name: "underline",
  addOptions() {
    return {
      HTMLAttributes: {},
      dictionary: {
        name: "Underline",
      },
    };
  },
  addStorage() {
    return {
      markdown: {
        parser: {
          match: (node) => node.type === "underline",
          apply: (state, node, type) => {
            state.openMark(type);
            state.next(node.children);
            state.closeMark(type);
          },
        },
        serializer: {
          match: (mark) => mark.type.name === this.name,
          apply: (state, mark) => {
            state.withMark(mark, {
              type: "underline",
            });
          },
        },
        hooks: {
          beforeInit: (processor) => processor.use(remarkDecoration("underline", "+")),
        },
      },
    } satisfies MarkMarkdownStorage;
  },
});
