export function presentDocument(document: any, options?: { isPublic?: boolean }) {
  try {
    return {
      id: document.id,
      title: document.title,
      content: document.content,
      type: document.type,
      visibility: document.visibility,
      icon: document.icon,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      publishedAt: document.publishedAt,
      archivedAt: document.archivedAt,
      deletedAt: document.deletedAt,
      position: document.position,
      parentId: document.parentId,
      workspaceId: document.workspaceId,
      subspaceId: document.subspaceId,
      // Include author info if not public
      // author: options?.isPublic
      //   ? undefined
      //   : {
      //       id: document.author.id,
      //       displayName: document.author.displayName,
      //       email: document.author.email,
      //       imageUrl: document.author.imageUrl,
      //     },
      // Include workspace/subspace info
      workspace: document.workspace,
      subspace: document.subspace,
      // Parent and children for navigation
      parent: document.parent,
      children: document.children,
      // Cover image
      coverImage: document.coverImage,
      // Revision count
      // revisionCount: document.revisions.length,
    };
  } catch (e) {
    console.log("presentDocument error", e);
    throw e;
  }
}
