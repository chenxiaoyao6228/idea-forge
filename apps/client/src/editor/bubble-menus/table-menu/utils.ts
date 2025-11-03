import type { Editor } from "@tiptap/react";
import type { EditorState } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { isTableSelected, Table } from "@idea/editor";

interface GripSelectionProps {
  editor: Editor; // TipTap editor instance
  view: EditorView; // ProseMirror editor view
  state: EditorState; // Current editor state
  from: number; // Position in the document
}

/**
 * Checks if a table row grip (handle) is currently selected
 * @param editor - TipTap editor instance
 * @param view - ProseMirror editor view
 * @param state - Current editor state
 * @param from - Position in the document
 * @returns Boolean indicating if a row grip is selected
 */
export const isRowGripSelected = ({ editor, view, state, from }: GripSelectionProps): boolean => {
  // Get DOM node at current position
  const domAtPos = view.domAtPos(from).node as HTMLElement;
  const nodeDOM = view.nodeDOM(from) as HTMLElement;
  const node = nodeDOM || domAtPos;

  // Early return if not in table context or if entire table is selected
  if (!editor.isActive(Table.name) || !node || isTableSelected(state.selection)) {
    return false;
  }

  // Traverse up the DOM tree until we find a table cell
  let container = node;
  while (container && !["TD", "TH"].includes(container.tagName)) {
    container = container.parentElement!;
  }

  // Check if there's a selected row grip within the cell
  const gripRow = container?.querySelector?.("a.grip-row.selected");
  return !!gripRow;
};

/**
 * Checks if a table column grip (handle) is currently selected
 * @param editor - TipTap editor instance
 * @param view - ProseMirror editor view
 * @param state - Current editor state
 * @param from - Position in the document
 * @returns Boolean indicating if a column grip is selected
 */
export const isColumnGripSelected = ({ editor, view, state, from }: GripSelectionProps): boolean => {
  // Get DOM node at current position
  const domAtPos = view.domAtPos(from).node as HTMLElement;
  const nodeDOM = view.nodeDOM(from) as HTMLElement;
  const node = nodeDOM || domAtPos;

  // Early return if not in table context or if entire table is selected
  if (!editor.isActive(Table.name) || !node || isTableSelected(state.selection)) {
    return false;
  }

  // Traverse up the DOM tree until we find a table cell
  let container = node;
  while (container && !["TD", "TH"].includes(container.tagName)) {
    container = container.parentElement!;
  }

  // Check if there's a selected column grip within the cell
  const gripColumn = container?.querySelector?.("a.grip-column.selected");
  return !!gripColumn;
};
