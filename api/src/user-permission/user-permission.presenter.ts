import { UserPermissionResponse } from "contracts";
import { DocUserPermission, User } from "@prisma/client";

type UserPermissionWithRelations = DocUserPermission & {
  user: Pick<User, "id" | "email" | "displayName">;
  doc?: {
    id: string;
    title: string;
    icon: string | null;
    parentId: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
};

export function presentUserPermission(permission: UserPermissionWithRelations): UserPermissionResponse {
  return {
    id: permission.id,
    userId: permission.userId,
    user: {
      id: permission.user.id.toString(),
      email: permission.user.email,
      displayName: permission.user.displayName,
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
