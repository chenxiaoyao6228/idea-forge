import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import { computePosition, flip, shift, offset, autoUpdate } from "@floating-ui/dom";
import { CommandList } from "./command-list";
import { commandGroups } from "./groups";
import { calculateStartPosition } from "./uitl";

export const extensionName = "slashCommands";
export const slashCommandsKey = new PluginKey(extensionName);

export const SlashCommands = Extension.create({
  name: extensionName,

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: "/",
        allowSpaces: true,
        startOfLine: true,
        allow: ({ editor, state, range }) => {
          const $from = state.doc.resolve(range.from);

          // Basic condition checks
          const isRootDepth = $from.depth === 1; // Check if at root level
          const isParagraph = $from.parent.type.name === "paragraph"; // Check if in paragraph
          const isStartOfNode = $from.parent.textContent?.charAt(0) === "/"; // Check if at start of node

          // Check content after slash to avoid consecutive spaces
          const afterContent = $from.parent.textContent?.substring($from.parent.textContent.indexOf("/"));
          const isValidAfterContent = !afterContent?.endsWith("  ");

          // Combined conditions:
          // 1. Must be at root level paragraph start
          // 2. Content format must be valid
          return isRootDepth && isParagraph && isStartOfNode && isValidAfterContent;
        },
        command: ({ editor, range, props }) => {
          const { view, state } = editor;
          const { $head, $from } = state.selection;

          try {
            // Calculate range of slash command text to delete
            const end = Math.min($from.pos, state.doc.content.size);
            const from = Math.max(0, calculateStartPosition($head, end, $from));

            // Only delete if range is valid
            if (from < end && from >= 0) {
              view.dispatch(state.tr.deleteRange(from, end));
            }

            // Execute the actual command
            props.command({ editor });

            // Ensure editor focus is restored
            requestAnimationFrame(() => {
              view.focus();
              editor.commands.scrollIntoView();
            });
          } catch (error) {
            console.warn("Slash command range error:", error);
            // Still try to execute the command even if text deletion fails
            props.command({ editor, range });
          }
        },
        items: ({ query }) => {
          return commandGroups
            .map((group) => ({
              ...group,
              commands: group.commands
                .filter((command) => {
                  const search = query.toLowerCase();
                  return command.label.toLowerCase().includes(search) || command.aliases?.some((alias) => alias.toLowerCase().includes(search));
                })
                .filter((command) => !command.shouldBeHidden?.(this.editor)),
            }))
            .filter((group) => group.commands.length > 0);
        },
        render: () => {
          let component: ReactRenderer | null = null;
          let popup: HTMLDivElement | null = null;
          let cleanup: (() => void) | null = null;

          return {
            onStart: (props) => {
              component = new ReactRenderer(CommandList, {
                props,
                editor: props.editor,
              });

              // Create floating container
              popup = document.createElement("div");
              popup.className = "slash-commands-menu";
              popup.style.position = "absolute";
              popup.style.zIndex = "9999";
              popup.appendChild(component.element);
              document.body.appendChild(popup);

              // Create virtual reference element
              const virtualElement = {
                getBoundingClientRect: () => props.clientRect?.() || new DOMRect(-1000, -1000, 0, 0),
              };

              // Setup floating positioning with auto-update
              cleanup = autoUpdate(virtualElement, popup, () => {
                computePosition(virtualElement, popup!, {
                  placement: "bottom-start",
                  middleware: [offset(8), flip(), shift({ padding: 8 })],
                }).then(({ x, y }) => {
                  if (popup) {
                    popup.style.left = `${x}px`;
                    popup.style.top = `${y}px`;
                  }
                });
              });
            },

            onUpdate: (props) => {
              component?.updateProps(props);

              // Position will be updated automatically by autoUpdate
            },

            onKeyDown: (props) => {
              if (props.event.key === "Escape") {
                return true;
              }

              return component?.ref && "onKeyDown" in (component.ref as object) ? (component.ref as any).onKeyDown(props) : false;
            },

            onExit: () => {
              // Cleanup auto-update
              if (cleanup) {
                cleanup();
                cleanup = null;
              }

              // Remove popup from DOM
              if (popup?.parentNode) {
                popup.parentNode.removeChild(popup);
              }

              // Destroy React component
              component?.destroy();

              popup = null;
              component = null;
            },
          };
        },
      }),
    ];
  },
});
