import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { Users, User } from "lucide-react";
import useWorkspaceStore from "@/stores/workspace";
import useGroupStore from "@/stores/group";
import useSubSpaceStore from "@/stores/subspace";
import { useRefCallback } from "@/hooks/use-ref-callback";
import { getInitialChar } from "@/lib/auth";

interface SubspaceMemberSelectProps {
  workspaceId: string;
  subspaceId?: string; // Optional - if provided, will filter out existing members
  selectedItems: MultiSelectOption[];
  onSelectionChange: (items: MultiSelectOption[]) => void;
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
  const fetchWorkspaceMembers = useWorkspaceStore((state) => state.fetchWorkspaceMembers);
  const fetchWorkspaceGroups = useGroupStore((state) => state.fetchWorkspaceGroups);
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

  // Transform users and groups to MultiSelectOption format
  const userOptions: MultiSelectOption[] = users
    .map((user) => ({
      value: `user-${user.id}`,
      label: user.displayName || user.email,
      type: "user" as const,
      id: user.id,
      avatar: user.imageUrl,
    }))
    .filter((user) => !existingMembers.includes(user.id));

  const groupOptions: MultiSelectOption[] = groups.map((group) => ({
    value: `group-${group.id}`,
    label: group.name,
    type: "group" as const,
    id: group.id,
    memberCount: group.memberCount,
  }));

  const hasUserOrGroupOptions = userOptions.length + groupOptions.length > 0;

  const allOptions = [
    { label: t("Members"), value: "separator-members", type: "separator" },
    ...userOptions,
    { label: t("Member Groups"), value: "separator-groups", type: "separator" },
    ...groupOptions,
  ];

  // Custom render functions for MultiSelect
  const renderOption = (option: MultiSelectOption) => {
    if (option.type === "separator") {
      return <div className="px-2 py-1.5 text-xs  bg-transparent">{option.label}</div>;
    }

    if (option.type === "user") {
      return (
        <div className="flex items-center space-x-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={option.avatar || undefined} />
            <AvatarFallback className="text-xs bg-gray-500 text-white">{getInitialChar(option.label)}</AvatarFallback>
          </Avatar>
          <span className="text-sm">{option.label}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2">
        <div className="h-6 w-6 rounded bg-gray-500 flex items-center justify-center">
          <span className="text-xs text-white">{getInitialChar(option.label)}</span>
        </div>
        <span className="text-sm">{option.label}</span>
        <span className="text-xs text-muted-foreground">
          ({option.memberCount} {t("members")})
        </span>
      </div>
    );
  };

  const renderBadge = (option: MultiSelectOption, onRemove: () => void) => {
    return (
      <div className="flex items-center space-x-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs">
        {option.type === "user" ? <User className="h-3 w-3" /> : <Users className="h-3 w-3" />}
        <span>{option.label}</span>
        <button
          className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onRemove();
            }
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={onRemove}
        >
          <span className="h-3 w-3 text-muted-foreground hover:text-foreground">×</span>
        </button>
      </div>
    );
  };

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
        <MultiSelect
          options={allOptions}
          selected={selectedItems}
          onSelectionChange={onSelectionChange}
          placeholder={placeholder || t("Select member or member group")}
          searchPlaceholder={searchPlaceholder || t("Search members or groups...")}
          renderOption={renderOption}
          renderBadge={renderBadge}
          disabled={disabled}
        />
      ) : (
        <div className="text-sm text-muted-foreground p-3 border rounded-md">
          {subspaceId ? t("All available workspace members and groups are already part of this subspace.") : t("No workspace members available.")}
        </div>
      )}
    </div>
  );
}
