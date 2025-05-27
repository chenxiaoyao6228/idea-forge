import { DragEndEvent, DragMoveEvent, DragOverEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import fractionalIndex from "fractional-index";
import { useCallback, useState } from "react";
import useSubSpaceStore from "@/stores/subspace";
import { NavigationNode } from "contracts";

export interface DragItem extends NavigationNode {
  subspaceId: string;
  depth: number;
  index: string;
}

export function useDragAndDropContext() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const allSubspaces = useSubSpaceStore((state) => state.allSubspaces);
  const moveSubspace = useSubSpaceStore((state) => state.move);

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
    (event: DragEndEvent) => {
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
