import { DragEndEvent, DragMoveEvent, DragOverEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import fractionalIndex from "fractional-index";
import { useCallback, useState } from "react";
import useSubSpaceStore, { getPersonalSubspace } from "@/stores/subspace";
import useDocumentStore from "@/stores/document";

/**
 * Drag and Drop Hook for Document and Subspace Management
 *
 * This hook handles drag and drop operations for documents and subspaces.
 *
 * Document Ordering:
 * - Documents now use array position-based ordering (0, 1, 2, ...) instead of fractional indexing
 * - The backend stores document order in the subspace's navigationTree JSON
 *
 * Subspace Ordering:
 * - Subspaces still use fractional indexing for smooth reordering
 * - This is appropriate since subspaces are typically fewer in number
 */

export interface DragItem {
  id: string;
  type: "document" | "subspace";
  parentId: string | null;
  subspaceId: string | null;
  // Optional: keep these if needed for UI/display purposes
  title: string;
  [key: string]: any;
}

export interface DropTarget {
  accept: string[];
  dropType: "reparent" | "reorder-top" | "reorder-bottom";
  subspaceId?: string | null;
  parentId?: string | null;
  documentId?: string;
  dropPosition?: "top" | "bottom";
  index?: number; // For document, index must be provided by the caller
}

// --- Document Handler ---
function handleDocumentDrop({
  draggingItem,
  toDropItem,
  moveDocument,
}: { draggingItem: DragItem; toDropItem: DropTarget; moveDocument: (params: any) => Promise<void> }) {
  if (!toDropItem.accept.includes("document")) return;

  let subspaceId = toDropItem.subspaceId;
  if (subspaceId === null || subspaceId === undefined) {
    const personalSubspace = getPersonalSubspace(useSubSpaceStore.getState());
    subspaceId = personalSubspace?.id;
  }

  if (toDropItem.dropType === "reparent") {
    // Reparent: set parentId to the target document's id
    moveDocument({
      id: draggingItem.id,
      oldSubspaceId: draggingItem.subspaceId,
      subspaceId,
      parentId: toDropItem.documentId,
      index: toDropItem.index,
    });
  } else if (toDropItem.dropType === "reorder-top") {
    // Reorder to top: set parentId to target's parentId, index as is
    moveDocument({
      id: draggingItem.id,
      oldSubspaceId: draggingItem.subspaceId,
      subspaceId,
      parentId: toDropItem.parentId,
      index: typeof toDropItem.index === "number" ? toDropItem.index : 0,
    });
  } else if (toDropItem.dropType === "reorder-bottom") {
    // Reorder to bottom: set parentId to target's parentId, index + 1
    moveDocument({
      id: draggingItem.id,
      oldSubspaceId: draggingItem.subspaceId,
      subspaceId,
      parentId: toDropItem.parentId,
      index: toDropItem.index,
    });
  }
}

// --- Subspace Handler ---
function handleSubspaceDrop({
  draggingItem,
  toDropItem,
  allSubspaces,
  moveSubspace,
}: { draggingItem: DragItem; toDropItem: DropTarget; allSubspaces: any[]; moveSubspace: (id: string, newIndex: string) => Promise<void> }) {
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

  moveSubspace(dragSubspace.id, newIndex);
}

export function useDragAndDropContext() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const allSubspaces = useSubSpaceStore((state) => state.allSubspaces);
  const moveSubspace = useSubSpaceStore((state) => state.move);
  const moveDocument = useDocumentStore((state) => state.move);

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
        handleDocumentDrop({ draggingItem, toDropItem, moveDocument });
      } else if (draggingItem.type === "subspace") {
        handleSubspaceDrop({ draggingItem, toDropItem, allSubspaces, moveSubspace });
      }
    },
    [allSubspaces, moveSubspace, moveDocument],
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
