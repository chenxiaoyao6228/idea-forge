import Emoji from "@tiptap/extension-emoji";
import type { NodeMarkdownStorage } from "../../../markdown/types";

/**
 * Emoji extension for inline emoji nodes
 * Converts emojis to nodes for consistent rendering and markdown serialization
 *
 * Note: Suggestion configuration is done in the client app
 * @see apps/client/src/editor/extensions/emoji/suggestion.ts
 */
export const EmojiNode = Emoji.extend({
  name: "emoji",

  // Explicitly set as inline node
  inline: true,
  group: "inline",
  atom: true,
  selectable: false,

  addOptions() {
    return {
      //@ts-ignore
      ...this.parent?.(),
      enableEmoticons: true, // Enable <3 -> ❤️ by default
      HTMLAttributes: {
        class: "emoji-node inline-block align-baseline",
      },
    };
  },

  addAttributes() {
    return {
      name: {
        default: null,
        parseHTML: (element) => element.dataset.name,
        renderHTML: (attributes) => ({
          "data-name": attributes.name,
        }),
      },
      emoji: {
        default: null,
        parseHTML: (element) => element.dataset.emoji || element.textContent,
        renderHTML: (attributes) => ({
          "data-emoji": attributes.emoji,
        }),
      },
    };
  },

  addInputRules() {
    // Override to prevent errors when using custom suggestion
    // Input rules are handled by the suggestion plugin instead
    return [];
  },

  renderHTML({ HTMLAttributes, node }) {
    // Use the emoji attribute directly instead of looking it up
    const emoji = node.attrs.emoji;
    return [
      "span",
      {
        ...HTMLAttributes,
        "data-type": this.name,
        "data-name": node.attrs.name,
        "data-emoji": emoji,
      },
      emoji || `:${node.attrs.name}:`,
    ];
  },

  renderText({ node }) {
    // Render as emoji character in plain text
    return node.attrs.emoji || `:${node.attrs.name}:`;
  },

  addStorage() {
    return {
      emojis: [],
      isSupported: () => false,
      markdown: {
        parser: {
          // Parse :emoji_name: format from markdown
          match: (node) => node.type === "text" && /^:[a-z0-9_+-]+:$/i.test(node.value),
          apply: (state, node) => {
            // The emoji extension will handle the actual emoji rendering
            state.addText(node.value);
          },
        },
        serializer: {
          // Serialize emoji back to :emoji_name: format
          match: (node) => node.type.name === this.name,
          apply: (state, node) => {
            // Get emoji name from node attributes
            const name = node.attrs.name || "";
            if (name) {
              state.addNode({
                type: "text",
                value: `:${name}:`,
              });
            } else {
              // Fallback to emoji character if no name
              state.addNode({
                type: "text",
                value: node.textContent,
              });
            }
          },
        },
      },
    };
  },
});
