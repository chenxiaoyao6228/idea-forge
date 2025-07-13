import { DragOverlay, useDraggable, useDroppable } from "@dnd-kit/core";
import { NavigationNode } from "@idea/contracts";
import { DocumentLink } from "./document-link";
import DropCursor from "./drop-cursor";

interface DraggableDocumentContainerProps {
  node: NavigationNode;
  subspaceId: string | null;
  parentId: string | null;
  depth: number; // for ui space indent
  index: number;
  getPathToDocument?: (documentId: string, subspaceId: string | null) => NavigationNode[];
}

export function DraggableDocumentContainer({ node, subspaceId, depth, index, parentId }: DraggableDocumentContainerProps) {
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

  // Move to top drop zone (only for first element)
  const { isOver: isReorderTopOver, setNodeRef: setReorderTopDropRef } = useDroppable({
    id: `document-reorder-top-${node.id}`,
    data: {
      documentId: node.id,
      title: node.title, // for visual display on development
      subspaceId,
      parentId,
      accept: ["document"],
      dropType: "reorder-top",
      index: 0,
    },
    disabled: index > 0,
  });

  // Reorder Bottom Drop Zone
  const { isOver: isReorderBottomOver, setNodeRef: setReorderBottomDropRef } = useDroppable({
    id: `document-reorder-bottom-${node.id}`,
    data: {
      documentId: node.id,
      title: node.title, // for visual display on development
      subspaceId,
      parentId,
      accept: ["document"],
      dropType: "reorder-bottom",
      index: index,
    },
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
    },
  });

  return (
    <div className="relative" style={{ minHeight: 36 }}>
      {/* Reorder Top Drop Zone */}
      {index === 0 && (
        <div ref={setReorderTopDropRef} className="absolute left-0 right-0 top-0 h-3 z-30" style={{ pointerEvents: "auto", opacity: isReorderTopOver ? 1 : 0 }}>
          <DropCursor isActiveDrop={isReorderTopOver} innerRef={null} position="top" />
        </div>
      )}

      {/* Reparent Drop Zone (main area) */}
      <div
        ref={setDragNodeRef}
        {...attributes}
        {...listeners}
        style={{
          opacity: isDragging ? 0.5 : 1,
        }}
      >
        <div ref={setReparentDropRef} className={"relative z-10"} style={{ minHeight: 36 }}>
          <DocumentLink
            node={node}
            subspaceId={subspaceId}
            depth={depth}
            index={index}
            parentId={parentId}
            isDragging={isDragging}
            isActiveDrop={isReparentOver}
          />
        </div>
      </div>

      {
        <div
          ref={setReorderBottomDropRef}
          className="absolute left-0 right-0 bottom-0 h-3 z-30"
          style={{ pointerEvents: "auto", opacity: isReorderBottomOver ? 1 : 0 }}
        >
          {isReorderBottomOver && <DropCursor isActiveDrop={isReorderBottomOver} innerRef={null} position="bottom" />}
        </div>
      }

      {isDragging && (
        <DragOverlay>
          <DocumentLink node={node} subspaceId={subspaceId} depth={depth} index={index} parentId={parentId} isDragging={isDragging} isActiveDrop={false} />
        </DragOverlay>
      )}
    </div>
  );
}
