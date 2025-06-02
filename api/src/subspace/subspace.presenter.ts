import { Subspace } from "@prisma/client";

export class SubspacePresenter {
  static toWebsocketEvent(subspace: Subspace) {
    return {
      id: subspace.id,
      name: subspace.name,
      avatar: subspace.avatar,
      workspaceId: subspace.workspaceId,
      type: subspace.type,
      index: subspace.index!,
      navigationTree: subspace.navigationTree as any[],
      updatedAt: subspace.updatedAt.toISOString(),
      createdAt: subspace.createdAt.toISOString(),
    };
  }

  static toResponse(subspace: Subspace) {
    return {
      ...subspace,
      createdAt: subspace.createdAt.toISOString(),
      updatedAt: subspace.updatedAt.toISOString(),
    };
  }
}
