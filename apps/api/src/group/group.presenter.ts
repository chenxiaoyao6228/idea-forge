import { Injectable } from "@nestjs/common";
import { MemberGroup } from "@idea/contracts";
import { GroupListResponse } from "@idea/contracts";

export function presentGroup(group: MemberGroup) {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
  };
}
