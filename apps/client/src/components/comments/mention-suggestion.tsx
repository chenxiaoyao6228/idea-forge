import { ReactRenderer } from "@tiptap/react";
import { computePosition, flip, shift, offset } from "@floating-ui/dom";
import { MentionList, MentionListRef } from "./mention-list";
import { SuggestionProps } from "@tiptap/suggestion";
import { MentionUserSummary } from "@idea/contracts";

/**
 * Create suggestion renderer for mention autocomplete
 *
 * Uses @floating-ui/dom to position the suggestion popup
 * Renders MentionList component with user suggestions
 */
export function createMentionSuggestionRenderer() {
  let component: ReactRenderer<MentionListRef> | null = null;
  let popup: HTMLDivElement | null = null;

  const updatePosition = async (clientRect: (() => DOMRect | null) | null) => {
    if (!clientRect || !popup) return;

    const rect = clientRect();
    if (!rect) return;

    const virtualElement = {
      getBoundingClientRect: () => rect,
    };

    const { x, y } = await computePosition(virtualElement, popup, {
      placement: "bottom-start",
      middleware: [
        offset(8),
        flip({
          fallbackPlacements: ["top-start", "bottom-start"],
        }),
        shift({ padding: 8 }),
      ],
    });

    Object.assign(popup.style, {
      left: `${x}px`,
      top: `${y}px`,
    });
  };

  return {
    onStart: (props: SuggestionProps<MentionUserSummary>) => {
      component = new ReactRenderer(MentionList, {
        props,
        editor: props.editor,
      });

      if (!props.clientRect) {
        return;
      }

      // Create popup element
      popup = document.createElement("div");
      popup.style.position = "absolute";
      popup.style.top = "0";
      popup.style.left = "0";
      popup.style.zIndex = "9999";
      popup.style.maxWidth = "400px";
      popup.appendChild(component.element);
      document.body.appendChild(popup);

      // Position the popup
      updatePosition(props.clientRect);
    },

    onUpdate(props: SuggestionProps<MentionUserSummary>) {
      component?.updateProps(props);

      if (!props.clientRect) {
        return;
      }

      // Update position
      updatePosition(props.clientRect);
    },

    onKeyDown(props: { event: KeyboardEvent }) {
      if (props.event.key === "Escape") {
        return true;
      }

      return component?.ref?.onKeyDown(props) ?? false;
    },

    onExit() {
      if (popup?.parentNode) {
        popup.parentNode.removeChild(popup);
      }
      component?.destroy();

      popup = null;
      component = null;
    },
  };
}
