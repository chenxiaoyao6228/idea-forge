import { mergeAttributes, Node } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Slice, Fragment } from "@tiptap/pm/model";
import Suggestion, { SuggestionOptions } from "@tiptap/suggestion";
import { MentionAttrs, MentionType } from "@idea/contracts";
import { v4 as uuidv4 } from "uuid";

export type MentionOptions = {
  HTMLAttributes: Record<string, any>;
  renderText: (props: { options: MentionOptions; node: any }) => string;
  suggestion: Omit<SuggestionOptions, "editor">;
};

export const MentionPluginKey = new PluginKey("mention");

/**
 * Custom Mention extension for user mentions in comments
 *
 * Key features:
 * - Each mention instance gets a unique UUID for diff tracking
 * - Stores modelId (user ID), label (display name), type, and actorId
 * - Integrates with suggestion plugin for autocomplete
 * - Generates new UUIDs on copy-paste to track each mention separately
 */
export const Mention = Node.create<MentionOptions>({
  name: "mention",

  addOptions() {
    return {
      HTMLAttributes: {
        class: "mention",
      },
      renderText({ options, node }) {
        return `${options.suggestion.char}${node.attrs.label ?? node.attrs.modelId}`;
      },
      suggestion: {
        char: "@",
        pluginKey: MentionPluginKey,
        command: ({ editor, range, props }) => {
          // Generate unique ID for this mention instance
          const mentionAttrs: MentionAttrs = {
            id: uuidv4(),
            type: MentionType.USER,
            modelId: props.modelId,
            label: props.label,
            actorId: props.actorId,
          };

          // Insert mention node
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: this.name,
                attrs: mentionAttrs,
              },
              {
                type: "text",
                text: " ",
              },
            ])
            .run();

          // Move cursor after the mention and space
          window.getSelection()?.collapseToEnd();
        },
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          const type = state.schema.nodes[this.name];
          const allow = !!$from.parent.type.contentMatch.matchType(type);

          return allow;
        },
      },
    };
  },

  group: "inline",

  inline: true,

  selectable: false,

  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-mention-id"),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {};
          }

          return {
            "data-mention-id": attributes.id,
          };
        },
      },
      type: {
        default: MentionType.USER,
        parseHTML: (element) => element.getAttribute("data-mention-type") || MentionType.USER,
        renderHTML: (attributes) => {
          return {
            "data-mention-type": attributes.type,
          };
        },
      },
      modelId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-model-id"),
        renderHTML: (attributes) => {
          if (!attributes.modelId) {
            return {};
          }

          return {
            "data-model-id": attributes.modelId,
          };
        },
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-label"),
        renderHTML: (attributes) => {
          if (!attributes.label) {
            return {};
          }

          return {
            "data-label": attributes.label,
          };
        },
      },
      actorId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-actor-id"),
        renderHTML: (attributes) => {
          if (!attributes.actorId) {
            return {};
          }

          return {
            "data-actor-id": attributes.actorId,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `span[data-mention-type="${MentionType.USER}"]`,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      this.options.renderText({
        options: this.options,
        node,
      }),
    ];
  },

  renderText({ node }) {
    return this.options.renderText({
      options: this.options,
      node,
    });
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () =>
        this.editor.commands.command(({ tr, state }) => {
          let isMention = false;
          const { selection } = state;
          const { empty, anchor } = selection;

          if (!empty) {
            return false;
          }

          state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
            if (node.type.name === this.name) {
              isMention = true;
              tr.insertText(this.options.suggestion.char || "", pos, pos + node.nodeSize);

              return false;
            }
          });

          return isMention;
        }),
    };
  },

  /**
   * Handle copy-paste to generate new UUIDs for pasted mentions
   * This ensures each mention instance can be tracked independently
   */
  addProseMirrorPlugins() {
    const self = this;

    return [
      // Suggestion plugin for autocomplete
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),

      // Transform pasted mentions to have new UUIDs
      new Plugin({
        key: new PluginKey("mention-paste-handler"),
        props: {
          transformPasted(slice) {
            // Recursively transform mentions to have new UUIDs
            const transformNode = (node: any): any => {
              if (node.type.name === self.name && node.attrs.id) {
                // Create a new mention node with a new UUID
                return node.type.create(
                  {
                    ...node.attrs,
                    id: uuidv4(),
                  },
                  node.content,
                  node.marks,
                );
              }
              // Recursively process child nodes if any
              if (node.content && node.content.size > 0) {
                const newContent: any[] = [];
                node.content.forEach((childNode: any) => {
                  newContent.push(transformNode(childNode));
                });
                return node.copy(Fragment.from(newContent));
              }
              return node;
            };

            // Transform all nodes in the slice
            const newNodes: any[] = [];
            slice.content.forEach((node: any) => {
              newNodes.push(transformNode(node));
            });

            return new Slice(Fragment.from(newNodes), slice.openStart, slice.openEnd);
          },
        },
      }),
    ];
  },
});
