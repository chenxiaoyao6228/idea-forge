export enum BusinessEvents {
  // Connection events
  GATEWAY_CONNECT = "gateway.connect",
  GATEWAY_DISCONNECT = "gateway.disconnect",
  AUTH_FAILED = "auth.failed",

  // Subspace events
  SUBSPACE_REORDER = "subspace.reorder",
  // SUBSPACE_UPDATE = "subspace.update",

  // User presence events
  // USER_ONLINE = "user.online",
  // USER_OFFLINE = "user.offline",
  // USER_KICK = "user.kick",

  // Document collaboration events
  // DOCUMENT_UPDATE = "document.update",
  // DOCUMENT_SYNC = "document.sync",
  // DOCUMENT_CURSOR = "document.cursor",
  // DOCUMENT_SELECTION = "document.selection",

  // Workspace events
  // WORKSPACE_UPDATE = "workspace.update",
  // WORKSPACE_MEMBER_UPDATE = "workspace.member.update",
}
