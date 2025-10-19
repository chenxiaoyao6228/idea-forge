import { type SubscriptExtensionOptions, Subscript as TSubscript } from "@tiptap/extension-subscript";
import type { MarkMarkdownStorage } from "../markdown/types";

export interface SubscriptOptions extends SubscriptExtensionOptions {
  dictionary: {
    name: string;
  };
}

export const Subscript = TSubscript.extend<SubscriptOptions>({
  name: "subscript",
  addOptions() {
    return {
      HTMLAttributes: {},
      dictionary: {
        name: "Subscript",
      },
    };
  },
  addStorage() {
    return {
      markdown: {
        parser: {
          match: (node) => node.type === "textDirective" && node.name === "sub",
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
              type: "textDirective",
              name: "sub",
            });
          },
        },
      },
    } satisfies MarkMarkdownStorage;
  },
});
