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
  PERMISSION_INHERITANCE_CHANGED = "permission.inheritance.changed",
  PERMISSION_OVERRIDE_CREATED = "permission.override.created",
  PERMISSION_OVERRIDE_REMOVED = "permission.override.removed",
  GROUP_PERMISSION_CHANGED = "permission.group.changed",
  GUEST_PERMISSION_UPDATED = "permission.guest.updated",
  GUEST_PERMISSION_INHERITED = "permission.guest.inherited",

  // Document collaboration events
  DOCUMENT_CREATE = "document.create",
  DOCUMENT_UPDATE = "document.update",
  DOCUMENT_MOVE = "document.move",
  DOCUMENT_ARCHIVE = "document.archive",
  DOCUMENT_DELETE = "document.delete",
  DOCUMENT_ADD_USER = "document.addUser",
  DOCUMENT_PUBLISHED = "document.published",

  // Document import events
  DOCUMENT_IMPORT_PREPARE = "document.import.prepare",
  DOCUMENT_IMPORT_START = "document.import.start",
  DOCUMENT_IMPORT_PROGRESS = "document.import.progress",
  DOCUMENT_IMPORT_COMPLETE = "document.import.complete",
  DOCUMENT_IMPORT_ERROR = "document.import.error",

  // Entities events
  ENTITIES = "entities",

  // Workspace events
  WORKSPACE_MEMBER_ADDED = "workspace.member.added",
  WORKSPACE_MEMBERS_BATCH_ADDED = "workspace.members.batch.added",
  WORKSPACE_INVITATIONS_BATCH_SENT = "workspace.invitations.batch.sent",
  WORKSPACE_MEMBER_ROLE_UPDATED = "workspace.member.role.updated",
  WORKSPACE_MEMBER_LEFT = "workspace.member.left",
  // WORKSPACE_UPDATE = "workspace.update",
  // WORKSPACE_MEMBER_UPDATE = "workspace.member.update",

  // Star events
  STAR_CREATE = "stars.create",
  STAR_UPDATE = "stars.update",
  STAR_DELETE = "stars.delete",

  // Guest collaborator events
  GUEST_INVITED = "guest.invited",
  GUEST_ACCEPTED = "guest.accepted",
  GUEST_REMOVED = "guest.removed",
  GUEST_PROMOTED = "guest.promoted",

  // Public share events
  PUBLIC_SHARE_CREATED = "public.share.created",
  PUBLIC_SHARE_UPDATED = "public.share.updated",
  PUBLIC_SHARE_REVOKED = "public.share.revoked",

  // Notification events
  NOTIFICATION_CREATE = "notification.create",
  NOTIFICATION_UPDATE = "notification.update",
  NOTIFICATION_ACTION_RESOLVED = "notification.action_resolved",

  // Comment events
  COMMENT_CREATED = "comment.created",
  COMMENT_UPDATED = "comment.updated",
  COMMENT_DELETED = "comment.deleted",
  COMMENT_RESOLVED = "comment.resolved",
  COMMENT_UNRESOLVED = "comment.unresolved",
  COMMENT_REACTION_ADDED = "comment.reaction_added",
  COMMENT_REACTION_REMOVED = "comment.reaction_removed",

  // Subscription events
  SUBSCRIPTION_CREATED = "subscription.created",
  SUBSCRIPTION_DELETED = "subscription.deleted",
}
