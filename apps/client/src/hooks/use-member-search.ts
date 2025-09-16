import React from "react";
import { userApi } from "@/apis/user";
import { groupApi } from "@/apis/group";
import { workspaceApi } from "@/apis/workspace";
import useRequest from "@ahooksjs/use-request";

export interface MemberSearchItem {
  id: string;
  type: "user" | "group";
  name: string;
  email?: string;
  avatar?: string;
  memberCount?: number;
  isExistingMember?: boolean;
}

interface UseMemberSearchOptions {
  workspaceId?: string;
  query: string;
  enabled?: boolean;
  existingMemberIds?: Set<string>;
  existingGroupIds?: Set<string>;
}

export function useMemberSearch({ workspaceId, query, enabled = true, existingMemberIds = new Set(), existingGroupIds = new Set() }: UseMemberSearchOptions) {
  // Fetch workspace members when no query
  const { data: membersResponse, loading: membersLoading } = useRequest(() => workspaceApi.getWorkspaceMembers(workspaceId!), {
    ready: enabled && !!workspaceId && query.length === 0,
    refreshDeps: [enabled, workspaceId],
  });

  // Fetch groups when no query
  const { data: groupsResponse, loading: groupsLoading } = useRequest(() => groupApi.list({ workspaceId, limit: 1000 }), {
    ready: enabled && !!workspaceId && query.length === 0,
    refreshDeps: [enabled, workspaceId],
  });

  // Search users when query exists
  const { data: searchUsersResponse, loading: searchUsersLoading } = useRequest(
    () =>
      userApi.search({
        query,
        page: 1,
        limit: 100,
        sortBy: "createdAt",
      }),
    {
      ready: enabled && !!workspaceId && query.length > 0,
      refreshDeps: [enabled, workspaceId, query],
    },
  );

  // Search groups when query exists
  const { data: searchGroupsResponse, loading: searchGroupsLoading } = useRequest(
    () =>
      groupApi.list({
        query,
        page: 1,
        limit: 100,
        sortBy: "createdAt",
      }),
    {
      ready: enabled && !!workspaceId && query.length > 0,
      refreshDeps: [enabled, workspaceId, query],
    },
  );

  // Compute available members
  const availableMembers: MemberSearchItem[] = React.useMemo(() => {
    let members: MemberSearchItem[] = [];
    let groups: MemberSearchItem[] = [];

    if (query.length > 0) {
      // Use search results
      if (searchUsersResponse?.data) {
        members = searchUsersResponse.data.map((user: any) => ({
          id: user.id,
          type: "user" as const,
          name: user.displayName || user.email,
          email: user.email,
          avatar: user.imageUrl,
          isExistingMember: existingMemberIds.has(user.id),
        }));
      }

      if (searchGroupsResponse?.data) {
        groups = searchGroupsResponse.data.map((group: any) => ({
          id: group.id,
          type: "group" as const,
          name: group.name,
          memberCount: group.members?.length ?? 0,
          isExistingMember: existingGroupIds.has(group.id),
        }));
      }
    } else {
      // Use initial data
      if (membersResponse) {
        members = membersResponse.map((member: any) => ({
          id: member.userId,
          type: "user" as const,
          name: member.user.displayName || member.user.email,
          email: member.user.email,
          avatar: member.user.imageUrl,
          isExistingMember: existingMemberIds.has(member.userId),
        }));
      }

      if (groupsResponse?.data) {
        groups = groupsResponse.data.map((group: any) => ({
          id: group.id,
          type: "group" as const,
          name: group.name,
          memberCount: group.members?.length ?? 0,
          isExistingMember: existingGroupIds.has(group.id),
        }));
      }
    }

    return [...members, ...groups];
  }, [membersResponse, groupsResponse, searchUsersResponse, searchGroupsResponse, query, existingMemberIds, existingGroupIds]);

  const loading = membersLoading || groupsLoading || searchUsersLoading || searchGroupsLoading;

  return {
    availableMembers,
    loading,
  };
}
