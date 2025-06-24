import { isTextSelection } from "@tiptap/core";
import type { Editor } from "@tiptap/react";

export const hasSelectedText = ({ editor }: { editor: Editor }): boolean => {
  const {
    state: {
      doc,
      selection,
      selection: { empty, from, to },
    },
  } = editor;

  const hasNoTextContent = !doc.textBetween(from, to).length;
  const isEmptyTextSelection = hasNoTextContent && isTextSelection(selection);

  const hasValidSelection = !empty && !isEmptyTextSelection && editor.isEditable;

  return hasValidSelection;
};

export default hasSelectedText;
