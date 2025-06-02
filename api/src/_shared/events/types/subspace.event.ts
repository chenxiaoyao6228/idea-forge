export type SubspaceEventType = "subspace.create" | "subspace.update" | "subspace.move";

export interface SubspaceEvent {
  name: SubspaceEventType;
  subspaceId: string;
  workspaceId: string;
  actorId?: string;
  updatedAt: string;
  data?: {
    index?: string;
  };
}

export interface SubspaceCreateEvent extends Omit<SubspaceEvent, "name" | "updatedAt"> {
  name: "subspace.create";
}

export interface SubspaceUpdateEvent extends Omit<SubspaceEvent, "name" | "updatedAt"> {
  name: "subspace.update";
}

export interface SubspaceMoveEvent extends Omit<SubspaceEvent, "name" | "updatedAt"> {
  name: "subspace.move";
  index: string;
}
