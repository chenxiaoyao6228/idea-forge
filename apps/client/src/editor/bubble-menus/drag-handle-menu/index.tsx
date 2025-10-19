import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { useState, useCallback } from "react";
import DragHandle from "@tiptap/extension-drag-handle-react";
import type { MenuProps } from "../type";
import { Editor } from "@tiptap/core";
import DragButton from "./drag-button";
import InsertNodeButton from "./insert-button";

export default function DragHandleMenu(props: MenuProps) {
  const { editor } = props;
  const [currentNode, setCurrentNode] = useState<ProseMirrorNode | null>(null);
  const [currentNodePos, setCurrentNodePos] = useState<number>(-1);

  const handleNodeChange = useCallback(
    (data: { node: ProseMirrorNode | null; editor: Editor; pos: number }) => {
      if (data.node) {
        setCurrentNode(data.node);
      }

      setCurrentNodePos(data.pos);
    },
    [setCurrentNodePos, setCurrentNode],
  );

  return (
    <DragHandle editor={editor} pluginKey="DragHandleMenu" onNodeChange={handleNodeChange}>
      <div className="flex items-center gap-1">
        <InsertNodeButton editor={editor} currentNode={currentNode} currentNodePos={currentNodePos} />
        <DragButton editor={editor} currentNode={currentNode} currentNodePos={currentNodePos} />
      </div>
    </DragHandle>
  );
}
