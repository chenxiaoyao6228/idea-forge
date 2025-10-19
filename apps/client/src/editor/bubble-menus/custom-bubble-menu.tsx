import { type ReactNode, useEffect, useRef, useState } from "react";
import { type Editor } from "@tiptap/react";
import { useFloating, offset, flip, shift, autoUpdate, type Placement } from "@floating-ui/react";
import { createPortal } from "react-dom";

export interface CustomBubbleMenuProps {
  editor: Editor;
  children: ReactNode;
  shouldShow?: (props: { editor: Editor }) => boolean;
  updateDelay?: number;
  placement?: Placement;
  offsetDistance?: number;
  appendTo?: () => HTMLElement;
  getReferenceClientRect?: () => DOMRect;
  onHidden?: () => void;
}

export function CustomBubbleMenu({
  editor,
  children,
  shouldShow,
  updateDelay = 250,
  placement = "top",
  offsetDistance = 8,
  appendTo,
  getReferenceClientRect,
  onHidden,
}: CustomBubbleMenuProps) {
  const [isVisible, setIsVisible] = useState(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout>();

  const { refs, floatingStyles, update } = useFloating({
    placement,
    middleware: [
      offset(offsetDistance),
      flip({
        fallbackPlacements: ["bottom", "top"],
      }),
      shift({ padding: 8 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    const updatePosition = () => {
      const { state, view } = editor;
      const { from, to } = state.selection;

      // Clear any pending updates
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      // Check if we should show the menu
      const show = shouldShow ? shouldShow({ editor }) : from !== to;

      if (!show) {
        setIsVisible(false);
        if (onHidden) {
          onHidden();
        }
        return;
      }

      // Create virtual reference element for positioning
      const virtualEl = {
        getBoundingClientRect: () => {
          // Use custom positioning if provided
          if (getReferenceClientRect) {
            return getReferenceClientRect();
          }

          // Default: position at selection
          const start = view.coordsAtPos(from);
          const end = view.coordsAtPos(to);

          return {
            width: end.left - start.left,
            height: end.bottom - start.top,
            x: start.left,
            y: start.top,
            top: start.top,
            left: start.left,
            right: end.left,
            bottom: end.bottom,
            toJSON: () => ({}),
          };
        },
      };

      refs.setReference(virtualEl);

      // Delay showing the menu
      updateTimeoutRef.current = setTimeout(() => {
        setIsVisible(true);
        update?.();
      }, updateDelay);
    };

    // Update position on selection change
    const handleUpdate = () => {
      updatePosition();
    };

    editor.on("selectionUpdate", handleUpdate);
    editor.on("transaction", handleUpdate);
    editor.on("focus", handleUpdate);
    editor.on("blur", () => setIsVisible(false));

    // Initial update
    updatePosition();

    return () => {
      editor.off("selectionUpdate", handleUpdate);
      editor.off("transaction", handleUpdate);
      editor.off("focus", handleUpdate);
      editor.off("blur", () => setIsVisible(false));
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [editor, shouldShow, updateDelay, refs, update]);

  if (!isVisible) {
    return null;
  }

  const container = appendTo ? appendTo() : document.body;

  return createPortal(
    <div
      ref={refs.setFloating}
      style={{
        ...floatingStyles,
        zIndex: 1000,
      }}
    >
      {children}
    </div>,
    container,
  );
}
