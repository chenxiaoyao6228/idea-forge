import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { SuggestionOptions, SuggestionKeyDownProps } from "@tiptap/suggestion";
import { EmojiList, type EmojiListHandle } from "./emoji-list";
import { searchEmojis } from "./emoji-data";

/**
 * Emoji suggestion configuration for TipTap
 * Triggers on ':' character and shows filtered emoji list
 */
export const emojiSuggestion: Omit<SuggestionOptions, "editor"> = {
  char: ":",
  allowSpaces: false,

  items: ({ query }) => {
    // Search emojis based on query
    const emojis = searchEmojis(query, 15);

    // Convert to format expected by suggestion
    return emojis.map((emoji) => ({
      name: emoji.name,
      emoji: emoji.value,
      shortcodes: [emoji.id],
    }));
  },

  command: ({ editor, range, props }) => {
    // Replace the :text with the emoji node
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent({
        type: "emoji",
        attrs: {
          name: props.shortcodes?.[0] || props.name,
          emoji: props.emoji,
        },
      })
      .run();
  },

  render: () => {
    let component: ReactRenderer<EmojiListHandle> | undefined;
    let popup: TippyInstance[] | undefined;

    return {
      onStart: (props) => {
        component = new ReactRenderer(EmojiList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        popup = tippy("body", {
          getReferenceClientRect: props.clientRect as () => DOMRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
          maxWidth: "none",
        });
      },

      onUpdate(props) {
        component?.updateProps(props);

        if (!props.clientRect) {
          return;
        }

        popup?.[0]?.setProps({
          getReferenceClientRect: props.clientRect as () => DOMRect,
        });
      },

      onKeyDown(props: SuggestionKeyDownProps) {
        if (props.event.key === "Escape") {
          popup?.[0]?.hide();
          return true;
        }

        if (!component?.ref) {
          return false;
        }

        return component.ref.onKeyDown(props);
      },

      onExit() {
        popup?.[0]?.destroy();
        component?.destroy();
      },
    };
  },
};
