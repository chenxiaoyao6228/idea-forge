import { Injectable } from "@nestjs/common";
import { MemberGroup } from "@idea/contracts";
import { GroupListResponse } from "@idea/contracts";

export function presentGroup(group: any) {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    members:
      group.members?.map((member: any) => ({
        userId: member.userId,
        user: member.user,
      })) || [],
  };
}
