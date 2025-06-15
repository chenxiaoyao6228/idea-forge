import {  
  DragEndEvent,  
  DragMoveEvent,  
  DragOverEvent,  
  DragStartEvent,  
  PointerSensor,  
  useSensor,  
  useSensors,  
} from "@dnd-kit/core";  
import fractionalIndex from "fractional-index";  
import { useCallback, useState } from "react";  
import useSubSpaceStore from "@/stores/subspace";  
import { NavigationNode } from "contracts";  
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

export interface DropEventParams {
  draggingItem: DragItem;
  toDropItem: DropTarget;
  allSubspaces: any[];
  getMyDocsRootDocuments: () => NavigationNode[];
  allDocuments: Record<string, any>;
}

export interface DropEventResult {
  type: 'document' | 'subspace' | 'none';
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
  
  const sensors = useSensors(  
    useSensor(PointerSensor, {  
      // Need to move 5px to trigger dragging  
      activationConstraint: {  
        delay: 100,  
        tolerance: 3,  
      },  
    })  
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
        getMyDocsRootDocuments,
        allDocuments,
      });

      if (result.type === 'document' && result.documentParams) {
        await moveDocument(result.documentParams);
      } else if (result.type === 'subspace' && result.subspaceParams) {
        moveSubspace(result.subspaceParams.id, result.subspaceParams.newIndex);
      }
    },  
    [allSubspaces, moveSubspace, moveDocument, getMyDocsRootDocuments, allDocuments]  
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
  const { draggingItem, toDropItem, allSubspaces, getMyDocsRootDocuments, allDocuments } = params;

  // Document drop logic
  if (
    draggingItem?.type === "document" &&
    toDropItem?.accept?.includes("document")
  ) {
    const documentParams = calculateDocumentMoveParams(
      draggingItem,
      toDropItem,
      getMyDocsRootDocuments,
      allDocuments
    );

    if (documentParams) {
      return {
        type: 'document',
        documentParams,
      };
    }
  }

  // Subspace drop logic
  if (
    draggingItem?.type === "subspace" &&
    toDropItem?.accept?.includes("subspace")
  ) {
    const dragSubspace = allSubspaces.find(
      (s) => s.id === draggingItem.subspaceId
    );
    if (!dragSubspace) return { type: 'none' };

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
      const dropSubspace = allSubspaces.find(
        (s) => s.id === toDropItem.subspaceId
      );
      if (!dropSubspace || dragSubspace.id === dropSubspace.id) return { type: 'none' };

      const dropIndex = allSubspaces.findIndex(
        (s) => s.id === dropSubspace.id
      );

      const belowSubspace = allSubspaces[dropIndex + 1];
      newIndex = fractionalIndex(
        dropSubspace.index,
        belowSubspace?.index || null
      );
    } else {
      return { type: 'none' };
    }

    return {
      type: 'subspace',
      subspaceParams: {
        id: dragSubspace.id,
        newIndex,
      },
    };
  }

  return { type: 'none' };
}

function calculateDocumentMoveParams(  
  draggingItem: DragItem,  
  toDropItem: DropTarget,  
  getMyDocsRootDocuments: () => NavigationNode[],  
  allDocuments: Record<string, any>  
) {  
  return {  
    id: draggingItem.id,  
    subspaceId:  
      toDropItem.subspaceId === undefined ? null : toDropItem.subspaceId,  
    parentId:  
      toDropItem.dropType === "reparent"  
        ? toDropItem.documentId  
        : toDropItem.parentId,  
    index: calculateDocumentFractionalIndex(  
      draggingItem,   
      toDropItem,   
      getMyDocsRootDocuments,  
      allDocuments  
    ),  
  };  
}  
  
function calculateDocumentFractionalIndex(  
  draggingItem: DragItem,  
  toDropItem: DropTarget,  
  getMyDocsRootDocuments: () => NavigationNode[],  
  allDocuments: Record<string, any>  
): string | undefined {  
  // For my-docs (subspaceId is null), use fractional indexing  
  if (toDropItem.subspaceId === null || toDropItem.subspaceId === undefined) {  
    const myDocsDocuments = getMyDocsRootDocuments();  
      
    if (toDropItem.dropType === "top") {  
      const firstDoc = myDocsDocuments[0];  
      return fractionalIndex(null, firstDoc?.index || null);  
    }  
      
    if (toDropItem.dropType === "bottom") {  
      const lastDoc = myDocsDocuments[myDocsDocuments.length - 1];  
      return fractionalIndex(lastDoc?.index || null, null);  
    }  
      
    if (toDropItem.dropType === "reorder") {  
      const targetDoc = myDocsDocuments.find(doc => doc.id === toDropItem.documentId);  
      if (!targetDoc) return undefined;  
        
      const targetIndex = myDocsDocuments.findIndex(doc => doc.id === toDropItem.documentId);  
        
      if (toDropItem.dropPosition === "top") {  
        // Insert before target  
        const prevDoc = myDocsDocuments[targetIndex - 1];  
        return fractionalIndex(prevDoc?.index || null, targetDoc.index || null);  
      } else {  
        // Insert after target  
        const nextDoc = myDocsDocuments[targetIndex + 1];  
        return fractionalIndex(targetDoc.index || null, nextDoc?.index || null);  
      }  
    }  
      
    if (toDropItem.dropType === "reparent") {  
      // For reparenting, we need to get children of the target parent  
      const parentId = toDropItem.documentId;  
      const parentChildren = Object.values(allDocuments)  
        .filter((doc: any) => doc.parentId === parentId && doc.subspaceId === null)  
        .sort((a: any, b: any) => (a.index || "").localeCompare(b.index || ""));  
        
      if (parentChildren.length === 0) {  
        return fractionalIndex(null, null);  
      }  
        
      // Insert at beginning of children  
      return fractionalIndex(null, parentChildren[0]?.index || null);  
    }  
  }  
    
  // For subspace documents, return undefined to let server handle indexing  
  // This maintains backward compatibility with existing subspace document logic  
  return undefined;  
}