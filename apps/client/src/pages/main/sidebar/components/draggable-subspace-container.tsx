import * as React from "react";
import { useCallback, useState } from "react";
import { SubspaceEntity } from "@/stores/subspace";
import { SubspaceLink } from "./subspace-link";
import DropCursor from "./drop-cursor";
import { DragOverlay, useDndContext, useDraggable, useDroppable } from "@dnd-kit/core";

interface DraggableSubspaceContainerProps {
  subspace: SubspaceEntity;
  depth?: number;
}

export function DraggableSubspaceContainer({ subspace, depth = 0 }: DraggableSubspaceContainerProps) {
  const { active } = useDndContext();
  const isDraggingSubspace = active?.data?.current?.type === "subspace";
  const isDraggingDocument = active?.data?.current?.type === "document";

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

  const { isOver: isReorderTopOver, setNodeRef: setReorderTopDropRef } = useDroppable({
    id: `subspace-reorder-top-${subspace.id}`,
    data: {
      subspaceId: subspace.id,
      accept: ["subspace"],
      dropType: "reorder-top",
      index: 0,
    },
    disabled: !isDraggingSubspace,
  });

  // Reorder Bottom Drop Zone
  const { isOver: isReorderBottomOver, setNodeRef: setReorderBottomDropRef } = useDroppable({
    id: `subspace-reorder-bottom-${subspace.id}`,
    data: {
      subspaceId: subspace.id,
      accept: ["subspace"],
      dropType: "reorder-bottom",
      index: 0,
    },
    disabled: !isDraggingSubspace,
  });

  // Add document drop zone for cross-subspace DnD
  const { isOver: isDocumentDropOver, setNodeRef: setDocumentDropRef } = useDroppable({
    id: `subspace-document-drop-${subspace.id}`,
    data: {
      subspaceId: subspace.id,
      accept: ["document"],
      dropType: "reorder-top", // treat as root-level document drop
      parentId: null,
    },
    disabled: false,
  });

  return (
    <div className="relative" style={{ minHeight: 36 }}>
      {/* Reorder Top Drop Zone */}
      <div ref={setReorderTopDropRef} className="absolute left-0 right-0 top-0 h-3 z-30" style={{ pointerEvents: "auto", opacity: isReorderTopOver ? 1 : 0 }}>
        <DropCursor isActiveDrop={isReorderTopOver} innerRef={null} position="top" />
      </div>

      {/* Main Draggable Area */}
      <div ref={setDocumentDropRef} className="relative">
        <div ref={setDragNodeRef} {...attributes} {...listeners} style={{ opacity: isDragging ? 0.5 : 1 }}>
          <div className={"relative z-10"} style={{ minHeight: 36 }}>
            <SubspaceLink subspace={subspace} depth={depth} isDragging={isDragging} isActiveDrop={isDraggingDocument && isDocumentDropOver} />
          </div>
        </div>
      </div>

      {/* Reorder Bottom Drop Zone */}
      <div
        ref={setReorderBottomDropRef}
        className="absolute left-0 right-0 bottom-0 h-3 z-30"
        style={{ pointerEvents: "auto", opacity: isReorderBottomOver ? 1 : 0 }}
      >
        <DropCursor isActiveDrop={isReorderBottomOver} innerRef={null} position="bottom" />
      </div>

      {isDragging && (
        <DragOverlay>
          <SubspaceLink subspace={subspace} depth={depth} isDragging={isDragging} isActiveDrop={false} isDraggingOverlay={true} />
        </DragOverlay>
      )}
    </div>
  );
}
