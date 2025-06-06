import { UserPermissionResponse } from "contracts";
import { DocUserPermission, User } from "@prisma/client";

type UserPermissionWithRelations = DocUserPermission & {
  user: Pick<User, "id" | "email" | "displayName">;
};

export function presentUserPermission(permission: UserPermissionWithRelations): UserPermissionResponse {
  return {
    id: permission.id,
    userId: permission.userId.toString(),
    user: {
      id: permission.user.id.toString(),
      email: permission.user.email,
      displayName: permission.user.displayName,
    },
    documentId: permission.docId,
    permission: permission.permission,
    createdAt: permission.createdAt.toISOString(),
    updatedAt: permission.updatedAt.toISOString(),
  };
}
