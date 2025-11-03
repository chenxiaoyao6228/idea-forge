/**
 * Rehype plugin to convert math nodes to TipTap-compatible HTML
 *
 * Converts remark-math AST nodes to HTML that TipTap's Mathematics extension can parse:
 * - inlineMath: <span data-type="inline-math" data-latex="...">
 * - math (block): <div data-type="block-math" data-latex="...">
 */

import type { Root, Element } from "hast";
import { visit } from "unist-util-visit";

/**
 * Convert math nodes from remark-math to TipTap Mathematics format
 */
export function rehypeTiptapMath() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      const classNames = Array.isArray(node.properties?.className) ? node.properties.className : [];

      // Handle inline math: <code class="language-math math-inline">
      if (node.tagName === "code" && classNames.includes("math-inline")) {
        const latex = getTextContent(node);

        // Replace the code element with a span
        node.tagName = "span";
        node.properties = {
          "data-type": "inline-math",
          "data-latex": latex,
        };
        // Clear children since TipTap will render the math
        node.children = [];
      }

      // Handle block math: <pre><code class="language-math math-display">
      // We need to transform the parent <pre> element
      if (node.tagName === "pre") {
        const codeChild = node.children.find((child: any) => child.tagName === "code") as Element | undefined;
        if (codeChild) {
          const codeClassNames = Array.isArray(codeChild.properties?.className) ? codeChild.properties.className : [];
          if (codeClassNames.includes("math-display")) {
            const latex = getTextContent(codeChild);

            // Replace the pre element with a div
            node.tagName = "div";
            node.properties = {
              "data-type": "block-math",
              "data-latex": latex,
            };
            // Clear children since TipTap will render the math
            node.children = [];
          }
        }
      }
    });
  };
}

/**
 * Extract text content from a node and its children
 */
function getTextContent(node: Element): string {
  let text = "";

  function traverse(n: any) {
    if (n.type === "text") {
      text += n.value;
    }
    if (n.children) {
      n.children.forEach(traverse);
    }
  }

  traverse(node);

  // Decode HTML entities that were encoded during HTML conversion
  const decoded = text
    .replace(/&#x26;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x60;/g, "`");

  return decoded.trim();
}
