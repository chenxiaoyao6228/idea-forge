import { DragEndEvent, DragMoveEvent, DragOverEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import fractionalIndex from "fractional-index";
import { useCallback, useState } from "react";
import useSubSpaceStore from "@/stores/subspace";
import useDocumentStore from "@/stores/document";

export interface DragItem {
  id: string;
  type: "document" | "subspace";
  subspaceId: string | null;
  index: string;
  // Optional: keep these if needed for UI/display purposes
  title: string;
  [key: string]: any;
}

export interface DropTarget {
  accept: string[];
  dropType: "top" | "bottom" | "reorder" | "reparent";
  subspaceId?: string | null;
  parentId?: string | null;
  documentId?: string;
  index?: string;
  dropPosition?: "top" | "bottom";
}

interface MyDocsDocument {
  id: string;
  index?: string | null;
}
export interface DropEventParams {
  draggingItem: DragItem;
  toDropItem: DropTarget;
  allSubspaces: any[];
  myDocsDocuments: MyDocsDocument[];
  allDocuments: Record<string, any>;
}

export interface DropEventResult {
  type: "document" | "subspace" | "none";
  documentParams?: {
    id: string;
    subspaceId?: string | null;
    parentId?: string | null;
    index?: string;
  };
  subspaceParams?: {
    id: string;
    newIndex: string;
  };
}

export function useDragAndDropContext() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const allSubspaces = useSubSpaceStore((state) => state.allSubspaces);
  const moveSubspace = useSubSpaceStore((state) => state.move);
  const moveDocument = useDocumentStore((state) => state.move);
  const getMyDocsRootDocuments = useDocumentStore((state) => state.getMyDocsRootDocuments);
  const allDocuments = useDocumentStore((state) => state.entities);
  const myDocsDocuments = getMyDocsRootDocuments();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Need to move 5px to trigger dragging
      activationConstraint: {
        delay: 100,
        tolerance: 3,
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
      const toDropItem = over.data.current as DropTarget;

      const result = processDropEvent({
        draggingItem,
        toDropItem,
        allSubspaces,
        myDocsDocuments,
        allDocuments,
      });

      if (result.type === "document" && result.documentParams) {
        await moveDocument(result.documentParams);
      } else if (result.type === "subspace" && result.subspaceParams) {
        await moveSubspace(result.subspaceParams.id, result.subspaceParams.newIndex);
      }
    },
    [allSubspaces, moveSubspace, moveDocument, getMyDocsRootDocuments, allDocuments],
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

export function processDropEvent(params: DropEventParams): DropEventResult {
  const { draggingItem, toDropItem, allSubspaces, myDocsDocuments, allDocuments } = params;

  // Document drop logic
  if (draggingItem?.type === "document" && toDropItem?.accept?.includes("document")) {
    const documentParams = calculateDocumentMoveParams(draggingItem, toDropItem, myDocsDocuments, allDocuments);

    if (documentParams) {
      return {
        type: "document",
        documentParams,
      };
    }
  }

  // Subspace drop logic
  if (draggingItem?.type === "subspace" && toDropItem?.accept?.includes("subspace")) {
    const dragSubspace = allSubspaces.find((s) => s.id === draggingItem.subspaceId);
    if (!dragSubspace) return { type: "none" };

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
      if (!dropSubspace || dragSubspace.id === dropSubspace.id) return { type: "none" };

      const dropIndex = allSubspaces.findIndex((s) => s.id === dropSubspace.id);

      const belowSubspace = allSubspaces[dropIndex + 1];
      newIndex = fractionalIndex(dropSubspace.index, belowSubspace?.index || null);
    } else {
      return { type: "none" };
    }

    return {
      type: "subspace",
      subspaceParams: {
        id: dragSubspace.id,
        newIndex,
      },
    };
  }

  return { type: "none" };
}

function safeFractionalIndex(a: string | null, b: string | null): string {
  // If both are null, fallback to fractionalIndex(null, null)
  if (!a && !b) return fractionalIndex(null, null);
  // If both are equal, fallback to fractionalIndex(null, null)
  if (a && b && a === b) return fractionalIndex(null, null);
  try {
    return fractionalIndex(a, b) || fractionalIndex(null, null);
  } catch (e) {
    return fractionalIndex(null, null);
  }
}

function calculateDocumentMoveParams(draggingItem: DragItem, toDropItem: DropTarget, myDocsDocuments: MyDocsDocument[], allDocuments: Record<string, any>) {
  let index = calculateDocumentFractionalIndex(draggingItem, toDropItem, myDocsDocuments, allDocuments);
  if (!index || typeof index !== "string") index = safeFractionalIndex(null, null);
  return {
    id: draggingItem.id,
    subspaceId: toDropItem.subspaceId === undefined ? null : toDropItem.subspaceId,
    parentId: toDropItem.dropType === "reparent" ? toDropItem.documentId : toDropItem.parentId,
    index,
  };
}

function calculateDocumentFractionalIndex(
  draggingItem: DragItem,
  toDropItem: DropTarget,
  myDocsDocuments: MyDocsDocument[],
  allDocuments: Record<string, any>,
): string {
  // For my-docs (subspaceId is null), use fractional indexing
  if (toDropItem.subspaceId === null || toDropItem.subspaceId === undefined) {
    if (toDropItem.dropType === "top") {
      const firstDoc = myDocsDocuments[0];
      return safeFractionalIndex(null, firstDoc?.index ?? null);
    }

    if (toDropItem.dropType === "bottom") {
      const lastDoc = myDocsDocuments[myDocsDocuments.length - 1];
      return safeFractionalIndex(lastDoc?.index ?? null, null);
    }

    if (toDropItem.dropType === "reorder") {
      const targetDoc = myDocsDocuments.find((doc) => doc.id === toDropItem.documentId);
      if (!targetDoc) return safeFractionalIndex(null, null);

      const targetIndex = myDocsDocuments.findIndex((doc) => doc.id === toDropItem.documentId);

      if (toDropItem.dropPosition === "top") {
        // Insert before target
        const prevDoc = myDocsDocuments[targetIndex];
        return safeFractionalIndex(prevDoc?.index ?? null, targetDoc.index ?? null);
      }

      // Insert after target
      const nextDoc = myDocsDocuments[targetIndex + 1];
      return safeFractionalIndex(targetDoc.index ?? null, nextDoc?.index ?? null);
    }

    if (toDropItem.dropType === "reparent") {
      // For reparenting, we need to get children of the target parent
      const parentId = toDropItem.documentId;
      const parentChildren = Object.values(allDocuments)
        .filter((doc: any) => doc.parentId === parentId && doc.subspaceId === null)
        .sort((a: any, b: any) => (a.index || "").localeCompare(b.index || ""));

      if (parentChildren.length === 0) {
        return safeFractionalIndex(null, null);
      }

      // Insert at beginning of children
      return safeFractionalIndex(null, parentChildren[0]?.index ?? null);
    }
  }

  // For subspace documents, fallback to 'z' (or safeFractionalIndex)
  return safeFractionalIndex(null, null);
}
