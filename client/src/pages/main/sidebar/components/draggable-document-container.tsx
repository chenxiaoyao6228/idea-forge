import { DragOverlay, useDraggable, useDroppable } from "@dnd-kit/core";
import { NavigationNode } from "contracts";
import { useCallback, useState } from "react";
import { DocumentLink } from "./document-link";
import DropCursor from "./drop-cursor";

interface DraggableDocumentContainerProps {
  node: NavigationNode;
  subspaceId: string | null;
  parentId: string | null;
  depth: number;
  index: number;
}

export function DraggableDocumentContainer({ node, subspaceId, depth, index, parentId }: DraggableDocumentContainerProps) {
  const [dropPosition, setDropPosition] = useState<"top" | "bottom">("bottom");

  // ====== drag ===========
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef: setDragNodeRef,
  } = useDraggable({
    id: node.id,
    data: {
      id: node.id,
      title: node.title, // for visual display on development
      parentId,
      type: "document",
      subspaceId: subspaceId,
    },
  });

  // ========= drop ==========

  // Reorder - drop zone
  const { isOver: isReorderOver, setNodeRef: setReorderDropRef } = useDroppable({
    id: `document-reorder-${node.id}`,
    data: {
      documentId: node.id,
      title: node.title, // for visual display on development
      subspaceId,
      parentId,
      accept: ["document"],
      dropType: "reorder",
      dropPosition,
    },
  });

  // Move to top drop zone (only for first element)
  const { isOver: isReorderTopOver, setNodeRef: setReorderTopDropRef } = useDroppable({
    id: `document-top-${node.id}`,
    data: {
      documentId: node.id,
      title: node.title, // for visual display on development
      subspaceId,
      parentId,
      accept: ["document"],
      dropType: "top",
    },
    disabled: index > 0,
  });

  // Reparent - drop zone
  const { isOver: isReparentOver, setNodeRef: setReparentDropRef } = useDroppable({
    id: `document-reparent-${node.id}`,
    data: {
      documentId: node.id,
      title: node.title, // for visual display on development
      subspaceId,
      parentId: node.id,
      accept: ["document"],
      dropType: "reparent",
      index: 0,
    },
  });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isReorderOver) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseY = e.clientY;
      const threshold = rect.top + rect.height / 2;
      setDropPosition(mouseY < threshold ? "top" : "bottom");
    },
    [isReorderOver],
  );

  return (
    <div className="relative">
      {/* Reorder top dropCursor */}
      {index === 0 && (isReorderOver || isReorderTopOver) && (
        // TODO: if possible, remove the 8'px
        <div ref={setReorderTopDropRef} className="relative h-[8px]">
          <DropCursor isActiveDrop={isReorderTopOver} innerRef={null} position="top" />
        </div>
      )}

      <div ref={setDragNodeRef} {...attributes} {...listeners}>
        <div ref={setReorderDropRef} onMouseMove={handleMouseMove}>
          <div ref={setReparentDropRef} className="relative">
            <DocumentLink
              node={node}
              subspaceId={subspaceId}
              depth={depth}
              index={index}
              parentId={parentId}
              isDragging={isDragging}
              isActiveDrop={isReorderOver || isReparentOver}
            />
            {/* Reorder DropCursor */}
            <DropCursor isActiveDrop={isReorderOver} innerRef={null} position={dropPosition} />
          </div>
        </div>
      </div>

      {isDragging && (
        <DragOverlay>
          <DocumentLink node={node} subspaceId={subspaceId} depth={depth} index={index} parentId={parentId} isDragging={isDragging} isActiveDrop={false} />
        </DragOverlay>
      )}
    </div>
  );
}
