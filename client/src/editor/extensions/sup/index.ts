import { type SuperscriptExtensionOptions, Superscript as TSuperscript } from "@tiptap/extension-superscript";
import type { MarkMarkdownStorage } from "../markdown/types";

export interface SuperscriptOptions extends SuperscriptExtensionOptions {
  dictionary: {
    name: string;
  };
}

export const Superscript = TSuperscript.extend<SuperscriptOptions>({
  name: "superscript",
  addOptions() {
    return {
      ...this.parent?.(),
      dictionary: {
        name: "Superscript",
      },
    };
  },
  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        parser: {
          match: (node) => node.type === "textDirective" && node.name === "sup",
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
              name: "sup",
            });
          },
        },
      },
    } satisfies MarkMarkdownStorage;
  },
});
