import { GroupPermissionResponse } from "contracts";
import { DocGroupPermission, MemberGroup } from "@prisma/client";

type GroupPermissionWithRelations = DocGroupPermission & {
  group: Pick<MemberGroup, "id" | "name">;
};

export function presentGroupPermission(permission: GroupPermissionWithRelations): GroupPermissionResponse {
  return {
    id: permission.id,
    groupId: permission.groupId,
    group: {
      id: permission.group.id,
      name: permission.group.name,
      memberCount: 0, // TODO: Get member count from group
    },
    documentId: permission.docId,
    permission: permission.permission,
    createdAt: permission.createdAt.toISOString(),
    updatedAt: permission.updatedAt.toISOString(),
  };
}
