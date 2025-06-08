import { Injectable } from "@nestjs/common";
import type { GroupPermissionListResponse, GroupPermissionResponse } from "contracts";
import type { DocGroupPermission } from "@prisma/client";

@Injectable()
export class GroupPermissionPresenter {
  toResponse(
    permission: DocGroupPermission & {
      group: { id: string; name: string; _count: { members: number } };
      doc?: { id: string; title: string };
    },
  ): GroupPermissionResponse {
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

  toListResponse(result: {
    permissions: (DocGroupPermission & {
      group: { id: string; name: string; _count: { members: number } };
      doc?: { id: string; title: string };
    })[];
    documents: any[];
    total: number;
    page: number;
    limit: number;
  }): GroupPermissionListResponse {
    return {
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
      data: {
        groupPermissions: result.permissions.map((p) => this.toResponse(p)),
        documents: result.documents.map((d) => ({
          id: d.id,
          title: d.title,
          icon: d.icon,
          parentId: d.parentId,
          createdAt: d.createdAt.toISOString(),
          updatedAt: d.updatedAt.toISOString(),
        })),
      },
      policies: {}, // TODO: Implement policies
    };
  }
}
