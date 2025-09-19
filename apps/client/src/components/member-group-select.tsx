import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MultipleSelector, { Option } from "@/components/ui/multi-selector";
import { Users, User } from "lucide-react";
import useWorkspaceStore, { useFetchMembers } from "@/stores/workspace";
import { useFetchWorkspaceGroups } from "@/stores/group-store";
import useSubSpaceStore from "@/stores/subspace";
import { useRefCallback } from "@/hooks/use-ref-callback";
import { getInitialChar } from "@/lib/auth";

interface SubspaceMemberSelectProps {
  workspaceId: string;
  subspaceId?: string; // Optional - if provided, will filter out existing members
  selectedItems: Option[];
  onSelectionChange: (items: Option[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
}

interface SubspaceUser {
  id: string;
  email: string;
  displayName: string | null;
  imageUrl: string | null;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
}

export function MemberAndGroupSelect({
  workspaceId,
  subspaceId,
  selectedItems,
  onSelectionChange,
  placeholder,
  searchPlaceholder,
  disabled = false,
}: SubspaceMemberSelectProps) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<SubspaceUser[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [existingMembers, setExistingMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Get store methods
  const { run: fetchWorkspaceMembers } = useFetchMembers();
  const { run: fetchWorkspaceGroups } = useFetchWorkspaceGroups();
  const fetchSubspace = useSubSpaceStore((state) => state.fetchSubspace);

  // Fetch users and groups
  const fetchData = useRefCallback(async () => {
    setLoading(true);
    try {
      const promises: Promise<any>[] = [fetchWorkspaceMembers(workspaceId), fetchWorkspaceGroups(workspaceId)];

      // If subspaceId is provided, also fetch existing members to filter them out
      if (subspaceId) {
        promises.push(fetchSubspace(subspaceId));
      }

      const [usersData, groupsData, ...subspaceData] = await Promise.all(promises);

      // Get existing member IDs if subspace data is available
      let existingMemberIds: string[] = [];
      if (subspaceId && subspaceData[0]) {
        existingMemberIds = subspaceData[0].members?.map((member: any) => member.userId) || [];
        setExistingMembers(existingMemberIds);
      }

      // Transform workspace members to SubspaceUser format, excluding existing members
      const transformedUsers: SubspaceUser[] = usersData
        .filter((member: any) => !existingMemberIds.includes(member.user.id))
        .map((member: any) => ({
          id: member.user.id,
          email: member.user.email,
          displayName: member.user.displayName,
          imageUrl: member.user.imageUrl,
        }));

      // Transform groups to Group format and filter out groups where all members are already in subspace
      const transformedGroups: Group[] = groupsData
        .map((group: any) => ({
          id: group.id,
          name: group.name,
          description: group.description,
          memberCount: group.members?.length || 0,
          members: group.members || [], // Keep original members for filtering
        }))
        .filter((group: any) => {
          // If no existing members, show all groups
          if (existingMemberIds.length === 0) {
            return true;
          }

          // Filter out groups where all members are already in the subspace
          const groupMemberIds = group.members.map((member: any) => member.user.id);
          const hasNonMemberUsers = groupMemberIds.some((memberId: string) => !existingMemberIds.includes(memberId));

          return hasNonMemberUsers;
        })
        .map((group: any) => ({
          id: group.id,
          name: group.name,
          description: group.description,
          memberCount: group.memberCount,
        }));

      setUsers(transformedUsers);
      setGroups(transformedGroups);
    } catch (error) {
      console.error("Failed to fetch users and groups:", error);
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Transform users and groups to Option format
  const userOptions: Option[] = users
    .map((user) => ({
      value: `user-${user.id}`,
      label: user.displayName || user.email,
      type: "user" as const,
      id: user.id,
      avatar: user.imageUrl || undefined,
      icon: <User className="h-3 w-3" />,
    }))
    .filter((user) => !existingMembers.includes(user.id));

  const groupOptions: Option[] = groups.map((group) => ({
    value: `group-${group.id}`,
    label: group.name,
    type: "group" as const,
    id: group.id,
    memberCount: group.memberCount.toString(),
    icon: <Users className="h-3 w-3" />,
  }));

  const hasUserOrGroupOptions = userOptions.length + groupOptions.length > 0;

  // Flatten options for MultipleSelector (it supports grouping via groupBy prop)
  const allOptions = [...userOptions, ...groupOptions];

  // Custom render functions for MultipleSelector
  const renderOption = (option: Option) => {
    if (option.type === "user") {
      return (
        <div className="flex items-center space-x-2 min-w-0">
          <Avatar className="h-6 w-6 flex-shrink-0">
            <AvatarImage src={typeof option.avatar === "string" ? option.avatar : undefined} />
            <AvatarFallback className="text-xs bg-gray-500 text-white">{getInitialChar(option.label)}</AvatarFallback>
          </Avatar>
          <span className="text-sm truncate">{option.label}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2 min-w-0">
        <div className="h-6 w-6 rounded bg-gray-500 flex items-center justify-center flex-shrink-0">
          <span className="text-xs text-white">{getInitialChar(option.label)}</span>
        </div>
        <span className="text-sm truncate">{option.label}</span>
        <span className="text-xs text-muted-foreground flex-shrink-0">
          ({option.memberCount} {t("members")})
        </span>
      </div>
    );
  };

  // Using default badge rendering from MultipleSelector with icons

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-sm text-muted-foreground">{t("Loading members...")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {hasUserOrGroupOptions ? (
        <MultipleSelector
          options={allOptions}
          value={selectedItems}
          onChange={onSelectionChange}
          placeholder={placeholder || t("Select member or member group")}
          searchPlaceholder={searchPlaceholder || t("Search members or groups...")}
          renderOption={renderOption}
          disabled={disabled}
          className="w-full"
        />
      ) : (
        <div className="text-sm text-muted-foreground p-3 border rounded-md">
          {subspaceId ? t("All available workspace members and groups are already part of this subspace.") : t("No workspace members available.")}
        </div>
      )}
    </div>
  );
}
