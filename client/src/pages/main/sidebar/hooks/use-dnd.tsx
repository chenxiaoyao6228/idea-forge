import { DragEndEvent, DragMoveEvent, DragOverEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import fractionalIndex from "fractional-index";
import { useCallback, useState } from "react";
import useSubSpaceStore from "@/stores/subspace";
import { NavigationNode } from "contracts";
import useDocumentStore from "@/stores/document";

export interface DragItem extends NavigationNode {
  subspaceId: string;
  depth: number;
  index: string;
}

export function useDragAndDropContext() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const allSubspaces = useSubSpaceStore((state) => state.allSubspaces);
  const moveSubspace = useSubSpaceStore((state) => state.move);
  const moveDocument = useDocumentStore((state) => state.move);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Need to move 5px to trigger dragging
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    console.log("Drag start", event.active.id);
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveId(null);

      const { active, over } = event;
      if (!over) return;

      const draggingItem = active.data.current as DragItem;
      const toDropItem = over.data.current;

      if (draggingItem?.type === "subspace" && toDropItem?.accept?.includes("subspace")) {
        const dragSubspace = allSubspaces.find((s) => s.id === draggingItem.subspaceId);
        if (!dragSubspace) return;

        let newIndex: string;

        // move to top
        if (toDropItem.dropType === "top") {
          const firstSubspace = allSubspaces[0];
          newIndex = fractionalIndex(null, firstSubspace?.index || null);
        }
        // move to bottom
        else if (toDropItem.dropType === "bottom") {
          const lastSubspace = allSubspaces[allSubspaces.length - 1];
          newIndex = fractionalIndex(lastSubspace?.index || null, null);
        }
        // normal order operation
        else if (toDropItem.dropType === "reorder") {
          const dropSubspace = allSubspaces.find((s) => s.id === toDropItem.subspaceId);
          if (!dropSubspace || dragSubspace.id === dropSubspace.id) return;

          const dropIndex = allSubspaces.findIndex((s) => s.id === dropSubspace.id);

          const belowSubspace = allSubspaces[dropIndex + 1];
          newIndex = fractionalIndex(dropSubspace.index, belowSubspace?.index || null);
        } else {
          return;
        }

        moveSubspace(dragSubspace.id, newIndex);
      }

      if (draggingItem?.type === "document" && toDropItem?.accept?.includes("document")) {
        const params = calculateDocumentMoveParams(draggingItem, toDropItem);
        if (params) {
          await moveDocument(params);
        }
      }
    },
    [allSubspaces, moveSubspace],
  );

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    // console.log("Drag move", event.active.id);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // console.log("Drag over", event.active.id);
  }, []);

  return {
    activeId,
    sensors,
    handleDragStart,
    handleDragEnd,
    handleDragMove,
    handleDragOver,
  };
}

function calculateDocumentMoveParams(draggingItem: DragItem, toDropItem: any) {
  return {
    id: draggingItem.id,
    subspaceId: toDropItem.subspaceId || draggingItem.subspaceId,
    parentId: toDropItem.dropType === "reparent" ? toDropItem.documentId : toDropItem.parentId,
    index: calculateNewIndex(draggingItem, toDropItem),
  };
}

function calculateNewIndex(draggingItem: DragItem, toDropItem: any): number {
  if (toDropItem.dropType === "reorder") {
    // 根据拖拽位置决定是插入到目标文档前面还是后面
    const targetIndex = Number.parseInt(toDropItem.index);
    return toDropItem.dropPosition === "top" ? targetIndex : targetIndex + 1;
  }
  if (toDropItem.dropType === "reparent") {
    // 成为子文档：插入到子文档列表开头
    return 0;
  }
  return 0;
}
