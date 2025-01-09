import { findChildren, type NodeWithPos } from "@tiptap/core";
import type { Node as ProsemirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
// @ts-ignore
import highlight from "highlight.js/lib/core";

// Parse nodes and convert highlight information into flattened text and class name arrays
function parseNodes(nodes: any[], className: string[] = []): { text: string; classes: string[] }[] {
  return nodes.flatMap((node) => {
    // Merge current class names with class names from node properties
    const classes = [...className, ...(node.properties ? node.properties.className : [])];

    // If node has children, process recursively
    if (node.children) {
      return parseNodes(node.children, classes);
    }

    // Return text and corresponding class names
    return {
      text: node.value,
      classes,
    };
  }); // Flatten result array
}

// Get highlight nodes, compatible with lowlight v1 and v2 versions
function getHighlightNodes(result: any) {
  // `.value` for lowlight v1, `.children` for lowlight v2
  return result.value || result.children || [];
}

// Check if specified alias or language is registered in highlight.js
function registered(aliasOrLanguage: string) {
  return Boolean(highlight.getLanguage(aliasOrLanguage));
}

// Generate line number decorations for code block
function createLineNumberDecorations(block: NodeWithPos) {
  // Get code text and split by newlines
  const textContent = block.node.textContent;
  const lineInfos = textContent.split("\n");

  // Start calculating positions
  let currentPos = block.pos + 1;

  // Iterate through all lines to generate widgets
  const decorations: Decoration[] = lineInfos.map((item, index) => {
    // Create a span element for the line number
    const span = document.createElement("span");
    span.className = "line-number";
    span.setAttribute("line", `${index + 1}`);
    span.textContent = "\u200B"; // Zero-width space for proper rendering

    // Widget has one position where it needs to be added
    // We calculate positions at the start of each line and add the created span
    const decoration = Decoration.widget(currentPos, (view) => span, {
      // side -1 indicates content is added to left of cursor
      side: -1,
      // Current content is not selectable
      ignoreSelection: true,
      // Remove on destroy to prevent anomalies
      destroy() {
        span.remove();
      },
    });

    // Update position
    currentPos += item.length + 1;

    return decoration;
  });

  return decorations;
}

// Generate decoration set for code block
function getDecorations({
  doc,
  name,
  lowlight,
  defaultLanguage,
}: {
  doc: ProsemirrorNode;
  name: string;
  lowlight: any;
  defaultLanguage: string | null | undefined;
}) {
  const decorations: Decoration[] = [];

  // Iterate through all nodes of specified type in document
  findChildren(doc, (node) => node.type.name === name).forEach((block) => {
    let from = block.pos + 1;
    const language = block.node.attrs.language || defaultLanguage;
    const languages = lowlight.listLanguages();

    // Choose highlighting method based on language
    const nodes =
      language && (languages.includes(language) || registered(language))
        ? getHighlightNodes(lowlight.highlight(language, block.node.textContent))
        : getHighlightNodes(lowlight.highlightAuto(block.node.textContent));

    // Create decorations for each highlight node
    const parsedNodes = parseNodes(nodes);

    parsedNodes.forEach((node) => {
      const to = from + node.text.length;

      if (node.classes.length) {
        const decoration = Decoration.inline(from, to, {
          class: node.classes.join(" "),
        });

        decorations.push(decoration);
      }

      from = to;
    });

    decorations.push(...createLineNumberDecorations(block));
  });

  // Create and return decoration set
  return DecorationSet.create(doc, decorations);
}

// Check if parameter is a function
function isFunction(param: Function) {
  return typeof param === "function";
}

export function LowlightPlugin({
  name,
  lowlight,
  defaultLanguage,
}: {
  name: string;
  lowlight: any;
  defaultLanguage: string | null | undefined;
}) {
  if (!["highlight", "highlightAuto", "listLanguages"].every((api) => isFunction(lowlight[api]))) {
    throw Error("You should provide an instance of lowlight to use the code-block-lowlight extension");
  }

  const lowlightPlugin: Plugin<any> = new Plugin({
    key: new PluginKey("lowlight"),

    state: {
      init: (_, { doc }) =>
        getDecorations({
          doc,
          name,
          lowlight,
          defaultLanguage,
        }),
      apply: (transaction, decorationSet, oldState, newState) => {
        const oldNodeName = oldState.selection.$head.parent.type.name;
        const newNodeName = newState.selection.$head.parent.type.name;
        const oldNodes = findChildren(oldState.doc, (node) => node.type.name === name);
        const newNodes = findChildren(newState.doc, (node) => node.type.name === name);

        if (
          transaction.docChanged &&
          // Apply decorations if:
          // selection includes named node,
          ([oldNodeName, newNodeName].includes(name) ||
            // OR transaction adds/removes named node,
            newNodes.length !== oldNodes.length ||
            // OR transaction has changes that completely encapsulate a node
            // (for example, a transaction that affects the entire document).
            // Such transactions can happen during collab syncing via y-prosemirror.
            transaction.steps.some((step) => {
              // @ts-ignore
              return (
                // @ts-ignore
                step.from !== undefined &&
                // @ts-ignore
                step.to !== undefined &&
                oldNodes.some((node) => {
                  // @ts-ignore
                  return (
                    // @ts-ignore
                    node.pos >= step.from &&
                    // @ts-ignore
                    node.pos + node.node.nodeSize <= step.to
                  );
                })
              );
            }))
        ) {
          return getDecorations({
            doc: transaction.doc,
            name,
            lowlight,
            defaultLanguage,
          });
        }

        return decorationSet.map(transaction.mapping, transaction.doc);
      },
    },

    props: {
      decorations(state) {
        return lowlightPlugin.getState(state);
      },
    },
  });

  return lowlightPlugin;
}
