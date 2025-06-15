import { SubspaceEntity } from "@/stores/subspace";

export interface DraggableItem {
  type: "subspace" | "document";
  id: string;
  subspaceId: string | null;
}

export interface DropTarget {
  accept: string[];
  dropType: "top" | "bottom" | "reorder";
  subspaceId: string | null;
}

export interface DraggableSubspaceContainerProps {
  subspace: SubspaceEntity;
  depth?: number;
}

export interface SubspaceLinkProps {
  subspace: SubspaceEntity;
  depth?: number;
  isDragging?: boolean;
  isActiveDrop?: boolean;
}
