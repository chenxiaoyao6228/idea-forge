import { useDraggable, useDroppable, DragOverlay, useDndContext } from "@dnd-kit/core";
import { StarLink } from "./star-link";
import DropCursor from "./drop-cursor";

export function DraggableStarContainer({ star, index, ...props }) {
  const { active } = useDndContext();
  const isDraggingStar = active?.data?.current?.type === "star";

  // Draggable logic
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: star.id,
    data: {
      type: "star",
      id: star.id,
      docId: star.docId,
      subspaceId: star.subspaceId,
    },
  });

  // Drop zone for reorder top
  const { isOver: isReorderTopOver, setNodeRef: setReorderTopDropRef } = useDroppable({
    id: `star-reorder-top-${star.id}`,
    data: {
      starId: star.id,
      accept: ["star"],
      dropType: "reorder-top",
    },
    disabled: !isDraggingStar,
  });

  // Drop zone for reorder bottom
  const { isOver: isReorderBottomOver, setNodeRef: setReorderBottomDropRef } = useDroppable({
    id: `star-reorder-bottom-${star.id}`,
    data: {
      starId: star.id,
      accept: ["star"],
      dropType: "reorder-bottom",
    },
    disabled: !isDraggingStar,
  });

  return (
    <div className="relative" style={{ minHeight: 36 }}>
      {/* Reorder Top Drop Zone */}
      {index === 0 && (
        <div ref={setReorderTopDropRef} className="absolute left-0 right-0 top-0 h-3 z-30" style={{ pointerEvents: "auto", opacity: isReorderTopOver ? 1 : 0 }}>
          <DropCursor isActiveDrop={isReorderTopOver} innerRef={null} position="top" />
        </div>
      )}

      {/* Main Draggable Area */}
      <div ref={setNodeRef} {...attributes} {...listeners} style={{ opacity: isDragging ? 0.5 : 1 }}>
        <StarLink star={star} isDragging={isDragging} {...props} />
      </div>

      {/* Reorder Bottom Drop Zone */}
      <div
        ref={setReorderBottomDropRef}
        className="absolute left-0 right-0 bottom-0 h-3 z-30"
        style={{ pointerEvents: "auto", opacity: isReorderBottomOver ? 1 : 0 }}
      >
        <DropCursor isActiveDrop={isReorderBottomOver} innerRef={null} position="bottom" />
      </div>
      {/* Drag Overlay */}
      {isDragging && (
        <DragOverlay>
          <StarLink star={star} isDragging={isDragging} isDraggingOverlay={true} {...props} />
        </DragOverlay>
      )}
    </div>
  );
}
