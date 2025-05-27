import * as React from "react";
import { useCallback, useState } from "react";
import { SubspaceEntity } from "@/stores/subspace";
import { SubspaceLink } from "./subspace-link";
import DropCursor from "./drop-cursor";
import { DragOverlay, useDraggable, useDroppable } from "@dnd-kit/core";

interface DraggableSubspaceContainerProps {
  subspace: SubspaceEntity;
  depth?: number;
  belowSubspace?: SubspaceEntity;
}

export function DraggableSubspaceContainer({ subspace, depth = 0, belowSubspace }: DraggableSubspaceContainerProps) {
  const [dropPosition, setDropPosition] = useState<"top" | "bottom">("bottom");

  // drag
  const {
    isDragging,
    attributes,
    listeners,
    setNodeRef: setDragNodeRef,
  } = useDraggable({
    id: subspace.id,
    data: {
      type: "subspace",
      subspaceId: subspace.id,
    },
    disabled: false,
  });

  // drop
  const { isOver: isReorderOver, setNodeRef: setReorderDropRef } = useDroppable({
    id: `subspace-reorder-${subspace.id}`,
    data: {
      subspaceId: subspace.id,
      accept: ["subspace"],
      dropType: "reorder",
    },
    disabled: false,
  });

  // move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isReorderOver || !isDragging) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseY = e.clientY;
      const threshold = rect.top + rect.height / 2;
      setDropPosition(mouseY < threshold ? "top" : "bottom");
    },
    [isReorderOver, isDragging],
  );

  return (
    <>
      <div ref={setDragNodeRef} className="draggable-subspace relative" onMouseMove={handleMouseMove} {...attributes} {...listeners}>
        <div ref={setReorderDropRef} className="droppable-subspace relative">
          <SubspaceLink subspace={subspace} depth={depth} isDragging={isDragging} isActiveDrop={isReorderOver} />
          <DropCursor isActiveDrop={isReorderOver} innerRef={null} position={dropPosition} />
        </div>
      </div>
      {isDragging && (
        <DragOverlay>
          <SubspaceLink subspace={subspace} depth={depth} isDragging={isDragging} isActiveDrop={false} />
        </DragOverlay>
      )}
    </>
  );
}
