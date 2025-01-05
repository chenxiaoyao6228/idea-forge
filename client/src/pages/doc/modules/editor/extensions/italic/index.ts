import { Italic as TItalic, type ItalicOptions as TItalicOptions } from "@tiptap/extension-italic";
import { markInputRule, markPasteRule } from "@tiptap/core";
import type { MarkMarkdownStorage } from "../markdown/types";

// Star input rule: matches text surrounded by asterisks for italics
// Example: *italic text*
const STAR_INPUT_REGEX = /(?:^|[^*])(\*(?!\s+\*)([^*]+)\*)$/;

// Star paste rule: globally matches text surrounded by asterisks for italics
// Example: This is *italic* text
const STAR_PASTE_REGEX = /(?:^|[^*])(\*(?!\s+\*)([^*]+)\*(?!\s+\*))/g;

// Underscore input rule: matches text surrounded by underscores for italics
// Example: _italic text_
const UNDERSCORE_INPUT_REGEX = /(?:^|[^_])(_(?!\s+_)([^_]+)_)$/;

// Underscore paste rule: globally matches text surrounded by underscores for italics
// Example: This is _italic_ text
const UNDERSCORE_PASTE_REGEX = /(?:^|[^_])(_(?!\s+_)([^_]+)_(?!\s+_))/g;

export interface ItalicOptions extends TItalicOptions {
  dictionary: {
    name: string;
  };
}

export const Italic = TItalic.extend<ItalicOptions>({
  name: "italic",
  addOptions() {
    return {
      ...this.parent?.(),
    };
  },
  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        parser: {
          match: (node) => node.type === "emphasis",
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
              type: "emphasis",
            });
          },
        },
      },
    } satisfies MarkMarkdownStorage;
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
