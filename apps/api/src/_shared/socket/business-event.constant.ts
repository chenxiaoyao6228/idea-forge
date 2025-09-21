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
  SUBSPACE_MEMBER_LEFT = "subspace.member.left",
  SUBSPACE_MEMBER_ADDED = "subspace.member.added",
  SUBSPACE_MEMBERS_BATCH_ADDED = "subspace.members.batch.added",
  SUBSPACE_ARCHIVE = "subspace.archive",
  SUBSPACE_RESTORE = "subspace.restore",

  JOIN = "join",
  JOIN_SUCCESS = "join.success",
  JOIN_ERROR = "join.error",

  // User presence events
  USER_ONLINE = "user.online",
  USER_OFFLINE = "user.offline",
  USER_KICK = "user.kick",

  // Permission events
  PERMISSION_ADD_USER = "permission.addUser",
  PERMISSION_REMOVE_USER = "permission.removeUser",
  PERMISSION_UPDATED = "permission.updated",
  ACCESS_REVOKED = "permission.access.revoked",
  DOCUMENT_SHARED = "permission.document.shared",
  SUBSPACE_PERMISSION_UPDATED = "permission.subspace.updated",

  // Document collaboration events
  DOCUMENT_CREATE = "document.create",
  DOCUMENT_UPDATE = "document.update",
  DOCUMENT_MOVE = "document.move",
  DOCUMENT_ARCHIVE = "document.archive",
  DOCUMENT_DELETE = "document.delete",
  DOCUMENT_ADD_USER = "document.addUser",

  // Entities events
  ENTITIES = "entities",

  // Workspace events
  WORKSPACE_MEMBER_ADDED = "workspace.member.added",
  WORKSPACE_MEMBERS_BATCH_ADDED = "workspace.members.batch.added",
  // WORKSPACE_UPDATE = "workspace.update",
  // WORKSPACE_MEMBER_UPDATE = "workspace.member.update",

  // Star events
  STAR_CREATE = "stars.create",
  STAR_UPDATE = "stars.update",
  STAR_DELETE = "stars.delete",
}
