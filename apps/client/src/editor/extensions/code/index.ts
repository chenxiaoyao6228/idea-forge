import { Code as TCode, type CodeOptions as TCodeOptions } from "@tiptap/extension-code";
import { markInputRule, markPasteRule } from "@tiptap/core";
import type { MarkMarkdownStorage } from "../markdown/types";

/*
Differences between code and code-block:
1. Purpose:
   - code: Used for inline code, typically short code snippets.
   - code-block: Used for multi-line code blocks, typically longer code segments.

2. Rendering:
   - code: Renders inline without breaking text flow.
   - code-block: Renders as a separate block, isolated from surrounding text.

3. Syntax:
   - code: In Markdown, wrapped in single backticks, e.g. `code`.
   - code-block: In Markdown, wrapped in triple backticks, can specify language:
     ```javascript
     // code block
     ```
4. Features:
   - code: Primarily used to highlight code or commands within text.
   - code-block: Supports syntax highlighting, line numbers, and more features.

5. Editor Implementation:
   - code: Implemented as a mark (marking).
   - code-block: Implemented as a node.
*/

const INPUT_REGEX = /(?:^|[^`])(`(?!\s+`)([^`]+)`)$/;
const PASTE_REGEX = /(?:^|[^`])(`(?!\s+`)([^`]+)`(?!\s+`))/g;

export interface CodeOptions extends TCodeOptions {
  dictionary: {
    name: string;
  };
}

export const Code = TCode.extend<CodeOptions>({
  name: "code",
  addOptions() {
    return {
      HTMLAttributes: {},
      dictionary: {
        name: "Code",
      },
    };
  },
  addAttributes() {
    return {
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
          match: (node) => node.type === "inlineCode",
          apply: (state, node, type) => {
            state.openMark(type);
            state.addText(node.value);
            state.closeMark(type);
          },
        },
        serializer: {
          match: (mark) => mark.type.name === this.name,
          apply: (state, _mark, node) => {
            state.addNode({
              type: "inlineCode",
              value: node.text ?? "",
            });
            return true;
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
