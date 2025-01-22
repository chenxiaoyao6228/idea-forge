import { useEditorStore } from "@/pages/doc/stores/editor-store";
import { Editor } from "@tiptap/react";
import { useEffect, useRef } from "react";

// We can only use toc items.length > 0 to check if the editor is ready,
// editor.on('create'), editor.on('update') won't work
export const useEditorMount = (callback: (editor: Editor) => void) => {
  const editor = useEditorStore((state) => state.editor);
  const items = useEditorStore((state) => state.tocItems);
  const updateCountRef = useRef(0);

  useEffect(() => {
    if (!editor || items.length === 0 || updateCountRef.current > 0) return;
    updateCountRef.current++;
    callback(editor);
  }, [editor, items]);
};
