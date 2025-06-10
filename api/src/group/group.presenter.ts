import { Injectable } from "@nestjs/common";
import { MemberGroup } from "@prisma/client";
import { GroupResponse, GroupListResponse } from "contracts";

@Injectable()
export class GroupPresenter {
  presentGroupInfo(
    group: MemberGroup & {
      members: {
        id: string;
        createdAt: Date;
        groupId: string;
        userId: string;
        user: {
          id: number;
          email: string;
          displayName: string | null;
        };
      }[];
    },
  ): GroupResponse {
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      workspaceId: group.workspaceId,
      validUntil: group.validUntil,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      members: group.members.map((member) => ({
        id: member.user.id,
        email: member.user.email,
        displayName: member.user.displayName,
      })),
    };
  }

  presentGroupList(
    groups: (MemberGroup & {
      members: {
        id: string;
        createdAt: Date;
        groupId: string;
        userId: string;
        user: {
          id: number;
          email: string;
          displayName: string | null;
        };
      }[];
    })[],
    total: number,
    page = 1,
    limit = 10,
  ): GroupListResponse {
    return {
      pagination: {
        page,
        limit,
        total,
      },
      data: groups.map((group) => this.presentGroupInfo(group)),
    };
  }
}
