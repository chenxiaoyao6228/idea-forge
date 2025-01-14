import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { useState, useCallback } from "react";
import DragHandle from "@tiptap-pro/extension-drag-handle-react";
import type { MenuProps } from "../type";
import { Editor } from "@tiptap/react";
import DragButton from "./drag-button";

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
    <DragHandle
      editor={editor}
      pluginKey="DragHandleMenu"
      onNodeChange={handleNodeChange}
      tippyOptions={{
        offset: [-4, 10],
        zIndex: 40,
      }}
    >
      <div className="flex items-center gap-2">
        <DragButton editor={editor} currentNode={currentNode} currentNodePos={currentNodePos} />
      </div>
    </DragHandle>
  );
}
