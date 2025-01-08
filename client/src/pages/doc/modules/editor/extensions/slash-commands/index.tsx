import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import tippy from "tippy.js";
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

          // Check if inside a column
          const isInColumn = editor.isActive("columns");

          // Check content after slash to avoid consecutive spaces
          const afterContent = $from.parent.textContent?.substring($from.parent.textContent.indexOf("/"));
          const isValidAfterContent = !afterContent?.endsWith("  ");

          // Combined conditions:
          // 1. Either at root level paragraph start
          // 2. Or at paragraph start within a column
          // 3. And content format is valid
          return ((isRootDepth && isParagraph && isStartOfNode) || (isInColumn && isParagraph && isStartOfNode)) && isValidAfterContent;
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
          let popup: any = null;

          return {
            onStart: (props) => {
              component = new ReactRenderer(CommandList, {
                props,
                editor: props.editor,
              });

              popup = tippy("body", {
                getReferenceClientRect: () => (props.clientRect?.() as DOMRect) || null,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
                theme: "slash-commands",
              });
            },

            onUpdate: (props) => {
              component?.updateProps(props);

              popup[0]?.setProps({
                getReferenceClientRect: props.clientRect,
              });
            },

            onKeyDown: (props) => {
              if (props.event.key === "Escape") {
                popup[0]?.hide();
                return true;
              }

              return component?.ref && "onKeyDown" in (component.ref as object) ? (component.ref as any).onKeyDown(props) : false;
            },

            onExit: () => {
              popup[0]?.destroy();
              component?.destroy();
            },
          };
        },
      }),
    ];
  },
});
