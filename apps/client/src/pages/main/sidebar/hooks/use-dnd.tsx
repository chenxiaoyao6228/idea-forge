/**
 * Drag and Drop Hook for Document and Subspace Management
 *
 * This hook handles drag and drop operations for documents, subspaces and stars.
 *
 * Document Ordering:
 * - Documents now use array position-based ordering (0, 1, 2, ...) instead of fractional indexing
 * - The backend stores document order in the subspace's navigationTree JSON
 *
 * Subspace Ordering:
 * - Subspaces still use fractional indexing for smooth reordering
 * - This is appropriate since subspaces are typically fewer in number
 *
 * Star Ordering:
 * - Stars use fractional indexing for smooth reordering
 */

import { DragEndEvent, DragMoveEvent, DragOverEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import fractionalIndex from "fractional-index";
import { useCallback, useState } from "react";
import useSubSpaceStore, { getPersonalSubspace, useMoveSubspace } from "@/stores/subspace-store";
import useDocumentStore, { useMoveDocument } from "@/stores/document-store";
import { useOrderedStars } from "@/stores/star-store";
import useStarStore from "@/stores/star-store";

export interface DragItem {
  id: string;
  type: "document" | "subspace" | "star";
  parentId: string | null;
  subspaceId: string | null;
  title: string;
  [key: string]: any;
}

export interface DropTarget {
  accept: string[];
  dropType: "reparent" | "reorder-top" | "reorder-bottom";
  subspaceId?: string | null;
  parentId?: string | null;
  starId?: string;
  documentId?: string;
  index?: number;
}

// --- Document DnD Hook ---
function useDocumentDnD() {
  const { run: moveDocument } = useMoveDocument();
  const handleDocumentDrop = useCallback(
    ({ draggingItem, toDropItem }: { draggingItem: DragItem; toDropItem: DropTarget }) => {
      if (!toDropItem.accept.includes("document")) return;
      let subspaceId = toDropItem.subspaceId;
      if (subspaceId === null || subspaceId === undefined) {
        const personalSubspace = getPersonalSubspace();
        subspaceId = personalSubspace?.id;
      }
      if (toDropItem.dropType === "reparent") {
        moveDocument({
          id: draggingItem.id,
          oldSubspaceId: draggingItem.subspaceId,
          subspaceId,
          parentId: toDropItem.documentId,
          index: toDropItem.index,
        });
      } else if (toDropItem.dropType === "reorder-top") {
        moveDocument({
          id: draggingItem.id,
          oldSubspaceId: draggingItem.subspaceId,
          subspaceId,
          parentId: toDropItem.parentId,
          index: typeof toDropItem.index === "number" ? toDropItem.index : 0,
        });
      } else if (toDropItem.dropType === "reorder-bottom") {
        moveDocument({
          id: draggingItem.id,
          oldSubspaceId: draggingItem.subspaceId,
          subspaceId,
          parentId: toDropItem.parentId,
          index: toDropItem.index,
        });
      }
    },
    [moveDocument],
  );
  return { handleDocumentDrop };
}

// --- Subspace DnD Hook ---
function useSubspaceDnD() {
  const allSubspaces = Object.values(useSubSpaceStore((state) => state.subspaces));
  const { run: moveSubspace } = useMoveSubspace();
  const handleSubspaceDrop = useCallback(
    ({ draggingItem, toDropItem }: { draggingItem: DragItem; toDropItem: DropTarget }) => {
      if (!toDropItem.accept.includes("subspace")) return;
      const dragSubspace = allSubspaces.find((s) => s.id === draggingItem.subspaceId);
      if (!dragSubspace) return;
      let newIndex: string;
      if (toDropItem.dropType === "reorder-top") {
        const firstSubspace = allSubspaces[0];
        newIndex = fractionalIndex(null, firstSubspace?.index || null);
      } else if (toDropItem.dropType === "reorder-bottom") {
        const lastSubspace = allSubspaces[allSubspaces.length - 1];
        newIndex = fractionalIndex(lastSubspace?.index || null, null);
      } else {
        return;
      }
      moveSubspace({ subspaceId: dragSubspace.id, index: newIndex });
    },
    [allSubspaces, moveSubspace],
  );
  return { handleSubspaceDrop };
}

// --- Star DnD Hook ---
function useStarDnD() {
  const orderedStars = useOrderedStars();

  // For updateStar, use direct setState with vanilla JS
  const updateStar = useCallback((id: string, changes: Partial<import("@/stores/star-store").StarEntity>) => {
    const stars = useStarStore.getState().stars;
    useStarStore.setState({
      stars: stars.map((star) => (star.id === id ? { ...star, ...changes } : star)),
    });
  }, []);

  const handleStarDrop = useCallback(
    ({ draggingItem, toDropItem }: { draggingItem: DragItem; toDropItem: DropTarget }) => {
      if (!toDropItem.accept.includes("star")) return;
      const dragIndex = orderedStars.findIndex((s) => s.id === draggingItem.id);
      const overIndex = orderedStars.findIndex((s) => s.id === toDropItem.starId);
      let newIndex: string;
      if (toDropItem.dropType === "reorder-top") {
        newIndex = fractionalIndex(null, orderedStars[0]?.index || null);
      } else if (toDropItem.dropType === "reorder-bottom") {
        if (overIndex === -1) return;
        if (dragIndex < overIndex) {
          newIndex = fractionalIndex(orderedStars[overIndex].index, orderedStars[overIndex + 1]?.index || null);
        } else {
          newIndex = fractionalIndex(orderedStars[overIndex - 1]?.index || null, orderedStars[overIndex].index);
        }
      } else {
        return;
      }
      updateStar(draggingItem.id, { index: newIndex });
    },
    [orderedStars, updateStar],
  );
  return { handleStarDrop };
}

export function useDragAndDropContext() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { handleDocumentDrop } = useDocumentDnD();
  const { handleSubspaceDrop } = useSubspaceDnD();
  const { handleStarDrop } = useStarDnD();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 3,
      },
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;
      const draggingItem = active.data.current as DragItem;
      const toDropItem = over.data.current as DropTarget;
      if (draggingItem.type === "document") {
        handleDocumentDrop({ draggingItem, toDropItem });
      } else if (draggingItem.type === "subspace") {
        handleSubspaceDrop({ draggingItem, toDropItem });
      } else if (draggingItem.type === "star") {
        handleStarDrop({ draggingItem, toDropItem });
      }
    },
    [handleDocumentDrop, handleSubspaceDrop, handleStarDrop],
  );

  const handleDragMove = useCallback((event: DragMoveEvent) => {}, []);
  const handleDragOver = useCallback((event: DragOverEvent) => {}, []);

  return {
    activeId,
    sensors,
    handleDragStart,
    handleDragEnd,
    handleDragMove,
    handleDragOver,
  };
}
