import { Mathematics } from "@tiptap/extension-mathematics";
import type { NodeMarkdownStorage } from "../../markdown/types";

/**
 * Mathematics extension for inline and block math formulas
 * Uses KaTeX to render LaTeX math expressions
 *
 * Markdown format:
 * - Inline math: $x^2$ or \(...\)
 * - Block math: $$\frac{a}{b}$$ or \[...\]
 *
 * @see https://tiptap.dev/docs/editor/extensions/nodes/mathematics
 */
export const MathExtension = Mathematics.extend({
  addOptions() {
    return {
      // @ts-ignore
      ...this.parent?.(),
      // KaTeX options
      katexOptions: {
        throwOnError: false, // Don't throw errors for invalid LaTeX
        output: "html", // Output as HTML
        displayMode: false,
        macros: {
          "\\R": "\\mathbb{R}", // Real numbers
          "\\N": "\\mathbb{N}", // Natural numbers
          "\\Z": "\\mathbb{Z}", // Integers
          "\\Q": "\\mathbb{Q}", // Rational numbers
          "\\C": "\\mathbb{C}", // Complex numbers
        },
      },
    };
  },

  addStorage() {
    return {
      // @ts-ignore
      ...this.parent?.(),
      markdown: {
        parser: {
          // Match both inline and block math nodes from remark-math
          match: (node) => node.type === "inlineMath" || node.type === "math",
          apply: (state, node, type) => {
            const latex = node.value as string;
            // Both inline and block math store latex in the 'latex' attribute
            state.openNode(type, { latex });
            state.closeNode();
          },
        },
        serializer: {
          // Match both inlineMath and blockMath TipTap nodes
          match: (node) => node.type.name === "inlineMath" || node.type.name === "blockMath",
          apply: (state, node) => {
            const latex = node.attrs.latex || "";
            const isBlockMath = node.type.name === "blockMath";

            // Serialize to markdown AST format that remark-math expects
            state.addNode({
              type: isBlockMath ? "math" : "inlineMath",
              value: latex,
              // remark-math uses 'value' to store the LaTeX formula
            });
          },
        },
      },
    } satisfies NodeMarkdownStorage;
  },
});

// Re-export the main Mathematics extension
export { Mathematics };
