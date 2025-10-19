import { Strike as TStrike, type StrikeOptions as TStrikeOptions } from "@tiptap/extension-strike";
import { markInputRule, markPasteRule } from "@tiptap/core";
import type { MarkMarkdownStorage } from "../markdown/types";

// 输入规则：匹配以双波浪线包围的文本，用于删除线
// 例如：~~strikethrough text~~
// 解释：
// (?:^|[^~]) - 匹配行首或非波浪线字符
// (~~(?!\s+~~) - 匹配两个波浪线，后面不能紧跟空格和两个波浪线
// ([^~]+) - 匹配任意非波浪线字符（删除线内容）
// ~~) - 匹配结束的两个波浪线
// $ - 匹配行尾
const INPUT_REGEX = /(?:^|[^~])(~~(?!\s+~~)([^~]+)~~)$/;

// 粘贴规则：全局匹配以双波浪线包围的文本，用于删除线
// 例如：This is ~~strikethrough~~ text
// 解释：
// (?:^|[^~]) - 匹配行首或非波浪线字符
// (~~(?!\s+~~) - 匹配两个波浪线，后面不能紧跟空格和两个波浪线
// ([^~]+) - 匹配任意非波浪线字符（删除线内容）
// ~~(?!\s+~~)) - 匹配结束的两个波浪线，后面不能紧跟空格和两个波浪线
// /g - 全局匹配标志
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
