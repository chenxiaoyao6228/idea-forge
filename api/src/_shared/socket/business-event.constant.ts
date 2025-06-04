export interface WebsocketEntitiesEvent {
  fetchIfMissing?: boolean;
  documentIds: { id: string; updatedAt?: string }[];
  subspaceIds: { id: string; updatedAt?: string }[];
  workspaceIds: string[];
  event: string;
}

export enum BusinessEvents {
  // Connection events
  GATEWAY_CONNECT = "gateway.connect",
  GATEWAY_DISCONNECT = "gateway.disconnect",
  AUTH_FAILED = "auth.failed",
  AUTH_SUCCESS = "auth.success",

  // Subspace events
  SUBSPACE_CREATE = "subspace.create",
  SUBSPACE_UPDATE = "subspace.update",
  SUBSPACE_MOVE = "subspace.move",
  JOIN = "join",
  JOIN_SUCCESS = "join.success",
  JOIN_ERROR = "join.error",

  // User presence events
  USER_ONLINE = "user.online",
  USER_OFFLINE = "user.offline",
  USER_KICK = "user.kick",

  // Document collaboration events
  DOCUMENT_CREATE = "document.create",
  DOCUMENT_UPDATE = "document.update",
  DOCUMENT_MOVE = "document.move",
  DOCUMENT_ARCHIVE = "document.archive",
  DOCUMENT_DELETE = "document.delete",

  // Entities events
  ENTITIES = "entities",

  // Workspace events
  // WORKSPACE_UPDATE = "workspace.update",
  // WORKSPACE_MEMBER_UPDATE = "workspace.member.update",

  // Star events
  STAR_CREATE = "stars.create",
  STAR_UPDATE = "stars.update",
  STAR_DELETE = "stars.delete",
}
