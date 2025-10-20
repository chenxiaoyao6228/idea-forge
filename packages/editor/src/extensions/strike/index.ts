import { Strike as TStrike, type StrikeOptions as TStrikeOptions } from "@tiptap/extension-strike";
import { markInputRule, markPasteRule } from "@tiptap/core";
import type { MarkMarkdownStorage } from "../../markdown/types";

// Input rule: Matches text wrapped in double tildes for strikethrough, e.g. ~~strikethrough text~~
// Explanation:
// (?:^|[^~]) - matches line start or a non-tilde character
// (~~(?!\s+~~) - matches two tildes not followed by space and tildes
// ([^~]+) - matches any non-tilde characters (the content to be strikethroughed)
// ~~) - matches closing double tildes
// $ - matches end of line
const INPUT_REGEX = /(?:^|[^~])(~~(?!\s+~~)([^~]+)~~)$/;

// Paste rule: Globally matches text wrapped in double tildes for strikethrough
// Example: This is ~~strikethrough~~ text
// Explanation:
// (?:^|[^~]) - matches line start or a non-tilde character
// (~~(?!\s+~~) - matches two tildes not followed by space and tildes
// ([^~]+) - matches any non-tilde characters (the content to be strikethroughed)
// ~~(?!\s+~~)) - matches closing double tildes not followed by space and tildes
// /g - global match flag
const PASTE_REGEX = /(?:^|[^~])(~~(?!\s+~~)([^~]+)~~(?!\s+~~))/g;

export interface StrikeOptions extends TStrikeOptions {
  dictionary: {
    name: string;
  };
}

export const Strike = TStrike.extend<StrikeOptions>({
  name: "strike",
  addOptions() {
    return {
      HTMLAttributes: {},
      dictionary: {
        name: "Strike",
      },
    };
  },
  addStorage() {
    return {
      markdown: {
        parser: {
          match: (node) => node.type === "delete",
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
              type: "delete",
            });
          },
        },
      },
    } satisfies MarkMarkdownStorage;
  },
  addInputRules() {
    return [
      markInputRule({
        find: INPUT_REGEX,
        type: this.type,
      }),
    ];
  },
  addPasteRules() {
    return [
      markPasteRule({
        find: PASTE_REGEX,
        type: this.type,
      }),
    ];
  },
});
