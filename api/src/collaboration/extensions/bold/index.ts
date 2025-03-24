import { markInputRule, markPasteRule } from "@tiptap/core";
import { Bold as TBold } from "@tiptap/extension-bold";
import { MarkdownStorage } from "../markdown";

// Star input rule: matches text surrounded by double asterisks for bold
// Example: **bold text**
const STAR_INPUT_REGEX = /(?:^|[^*])(\*\*(?!\s+\*\*)([^*]+)\*\*)$/;

// Star paste rule: globally matches text surrounded by double asterisks for bold
// Example: This is **bold** text
const STAR_PASTE_REGEX = /(?:^|[^*])(\*\*(?!\s+\*\*)([^*]+)\*\*(?!\s+\*\*))/g;

// Underscore input rule: matches text surrounded by double underscores for bold
// Example: __bold text__
const UNDERSCORE_INPUT_REGEX = /(?:^|[^_])(__(?!\s+__)([^_]+)__)$/;

// Underscore paste rule: globally matches text surrounded by double underscores for bold
// Example: This is __bold__ text
const UNDERSCORE_PASTE_REGEX = /(?:^|[^_])(__(?!\s+__)([^_]+)__(?!\s+__))/g;

export const Bold = TBold.extend({
  name: "bold",

  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        parser: {
          match: (node) => node.type === "strong",
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
              type: "strong",
            });
          },
        },
      },
    } satisfies MarkdownStorage;
  },
  addInputRules() {
    return [
      markInputRule({
        find: STAR_INPUT_REGEX,
        type: this.type,
      }),
      markInputRule({
        find: UNDERSCORE_INPUT_REGEX,
        type: this.type,
      }),
    ];
  },
  addPasteRules() {
    return [
      markPasteRule({
        find: STAR_PASTE_REGEX,
        type: this.type,
      }),
      markPasteRule({
        find: UNDERSCORE_PASTE_REGEX,
        type: this.type,
      }),
    ];
  },
});
