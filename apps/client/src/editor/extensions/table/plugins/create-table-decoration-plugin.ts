import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Editor } from "@tiptap/core";
import { getCellsInRow, getCellsInColumn, isColumnSelected, isRowSelected, selectColumn, selectRow } from "@idea/editor";

interface CreateTableDecorationPluginProps {
  editor: Editor;
  type: "column" | "row";
}

/**
 * Creates a ProseMirror plugin that handles the table cell/header decorations
 * This includes the grip handles for selecting rows/columns and their visual states
 */
export function createTableDecorationPlugin({ editor, type }: CreateTableDecorationPluginProps) {
  const pluginKey = new PluginKey(`table${type}DecorationPlugin`);

  return new Plugin({
    key: pluginKey,
    props: {
      decorations: (state) => {
        if (!editor.isEditable) return DecorationSet.empty;

        const { doc, selection } = state;
        const decorations: Decoration[] = [];

        // Get cells based on whether we're handling rows or columns
        const cells = type === "column" ? getCellsInRow(0)(selection) : getCellsInColumn(0)(selection);

        if (!cells) return DecorationSet.empty;

        cells.forEach(({ pos }: { pos: number }, index: number) => {
          decorations.push(
            Decoration.widget(pos + 1, () => {
              const isSelected = type === "column" ? isColumnSelected(index)(selection) : isRowSelected(index)(selection);

              // Build className based on state and position
              let className = `grip-${type}`;
              if (isSelected) className += " selected";
              if (index === 0) className += " first";
              if (index === cells.length - 1) className += " last";

              const grip = document.createElement("a");
              grip.className = className;

              // Add click handler for selection
              grip.addEventListener("pointerdown", (event) => {
                event.preventDefault();
                event.stopImmediatePropagation();

                const selectionFn = type === "column" ? selectColumn : selectRow;
                editor.view.dispatch(selectionFn(index)(editor.state.tr));
              });

              return grip;
            }),
          );
        });

        return DecorationSet.create(doc, decorations);
      },
    },
  });
}
