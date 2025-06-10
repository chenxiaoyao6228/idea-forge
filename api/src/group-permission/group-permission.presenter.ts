import type { GroupPermissionResponse } from "contracts";
import type { DocGroupPermission } from "@prisma/client";

type GroupPermissionWithRelations = DocGroupPermission & {
  group: {
    id: string;
    name: string;
    _count: {
      members: number;
    };
  };
  doc?: {
    id: string;
    title: string;
    icon: string | null;
    parentId: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
};

export function presentGroupPermission(permission: GroupPermissionWithRelations): GroupPermissionResponse {
  return {
    id: permission.id,
    groupId: permission.groupId,
    group: {
      id: permission.group.id,
      name: permission.group.name,
      memberCount: permission.group._count.members,
    },
    documentId: permission.docId,
    document: permission.doc
      ? {
          id: permission.doc.id,
          title: permission.doc.title,
        }
      : undefined,
    permission: permission.permission,
    createdAt: permission.createdAt.toISOString(),
    updatedAt: permission.updatedAt.toISOString(),
  };
}
