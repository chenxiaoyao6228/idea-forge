export function presentPublicShare(share: any) {
  const baseUrl = process.env.CLIENT_APP_URL || "http://localhost:5000";
  const url = share.urlId ? `${baseUrl}/share/${share.urlId}` : `${baseUrl}/share/${share.token}`;

  return {
    id: share.id,
    token: share.token,
    urlId: share.urlId,
    url,
    docId: share.docId,
    workspaceId: share.workspaceId,
    permission: share.permission,
    published: share.published,
    expiresAt: share.expiresAt,
    revokedAt: share.revokedAt,
    viewCount: share.viewCount,
    lastAccessedAt: share.lastAccessedAt,
    allowIndexing: share.allowIndexing,
    createdAt: share.createdAt,
    updatedAt: share.updatedAt,
    doc: {
      id: share.doc.id,
      title: share.doc.title,
    },
    workspace: {
      id: share.workspace.id,
      name: share.workspace.name,
    },
    author: {
      id: share.author.id,
      email: share.author.email,
      displayName: share.author.displayName,
    },
  };
}
