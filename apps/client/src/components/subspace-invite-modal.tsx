import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import useRequest from "@ahooksjs/use-request";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { subspaceApi } from "@/apis/subspace";
import { toast } from "sonner";
import { SubspaceRole } from "@idea/contracts";
import { confirmable, ContextAwareConfirmation, type ConfirmDialogProps } from "react-confirm";
import { useMemberSearch, MemberSearchItem } from "@/hooks/use-member-search";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";

interface SubspaceInviteModalProps {
  subspaceId: string;
  subspaceName: string;
  workspaceId: string;
  onInviteSuccess?: (invitedCount: number) => void;

  // react-confirm props
  show?: boolean;
  proceed?: (value: any) => void;
}

interface SelectedItem extends MemberSearchItem {
  role: SubspaceRole;
}

const SubspaceInviteModal: React.FC<ConfirmDialogProps<SubspaceInviteModalProps, any>> = ({
  show = false,
  proceed,
  subspaceId,
  subspaceName,
  workspaceId,
  onInviteSuccess,
}) => {
  const { t } = useTranslation();
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<SubspaceRole>("MEMBER");
  const [existingMemberIds, setExistingMemberIds] = useState<Set<string>>(new Set());
  const [existingGroupIds, setExistingGroupIds] = useState<Set<string>>(new Set());

  // Use debounced search to prevent flashing
  const { query: searchQuery, debouncedQuery, setQuery: setSearchQuery, resetQuery } = useDebouncedSearch("", 300);

  // Fetch existing subspace members
  const { data: subspaceMembersResponse, loading: subspaceMembersLoading } = useRequest(() => subspaceApi.getSubspaceMembers(subspaceId), {
    ready: show && !!subspaceId,
    refreshDeps: [show, subspaceId],
  });

  // Use the member search hook with debounced query
  const { availableMembers, loading: searchLoading } = useMemberSearch({
    workspaceId,
    query: debouncedQuery,
    enabled: show && !!workspaceId,
    existingMemberIds,
    existingGroupIds,
  });

  // Update existing member IDs when subspace members are loaded
  useEffect(() => {
    if (subspaceMembersResponse) {
      const existingUserIds = new Set(subspaceMembersResponse.members.map((m: any) => m.userId).filter(Boolean));
      const existingGroupIds = new Set(subspaceMembersResponse.members.map((m: any) => m.groupId).filter(Boolean));
      setExistingMemberIds(existingUserIds);
      setExistingGroupIds(existingGroupIds);
    }
  }, [subspaceMembersResponse]);

  // Reset state when modal closes
  useEffect(() => {
    if (!show) {
      setSelectedItems([]);
      resetQuery();
    }
  }, [show, resetQuery]);

  // Convert available members to multi-select options
  const multiSelectOptions: MultiSelectOption[] = availableMembers
    .filter((member) => !member.isExistingMember)
    .map((member) => ({
      value: member.id,
      label: member.name,
      ...member,
    }));

  // Convert selected items to multi-select format
  const selectedOptions: MultiSelectOption[] = selectedItems.map((item) => ({
    value: item.id,
    label: item.name,
    ...item,
  }));

  const handleSelectionChange = (selected: MultiSelectOption[]) => {
    const newSelectedItems: SelectedItem[] = selected.map((option) => {
      // Preserve existing role if member was already selected, otherwise use selectedRole
      const existingItem = selectedItems.find((item) => item.id === option.value);
      return {
        id: option.value,
        type: option.type,
        name: option.label,
        email: option.email,
        avatar: option.avatar,
        memberCount: option.memberCount,
        isExistingMember: option.isExistingMember,
        role: existingItem?.role || selectedRole,
      };
    });
    setSelectedItems(newSelectedItems);
  };

  const handleRoleChange = (newRole: SubspaceRole) => {
    setSelectedRole(newRole);
    // Also update existing selected items to the new role
    setSelectedItems((prev) => prev.map((item) => ({ ...item, role: newRole })));
  };

  // Invite members request
  const { run: inviteMembers, loading: inviteLoading } = useRequest(
    async (batchRequest: any) => {
      const response = await subspaceApi.batchAddSubspaceMembers(subspaceId, batchRequest);
      return response;
    },
    {
      manual: true,
      onSuccess: (response) => {
        if (response.success) {
          toast.success(`Successfully invited ${response.addedCount} new members`);
          onInviteSuccess?.(response.addedCount);
          proceed?.(response);
        } else {
          toast.error("Failed to invite some members");
        }
      },
      onError: (error) => {
        console.error("Failed to invite members:", error);
        toast.error("Failed to invite members");
      },
    },
  );

  // Calculate total member count including group members
  // Example: G1 (3 members) + User A = 4 total members
  const totalMemberCount = useMemo(() => {
    return selectedItems.reduce((total, item) => {
      if (item.type === "group" && item.memberCount) {
        // Add all members in the group
        return total + item.memberCount;
      }
      if (item.type === "user") {
        // Add individual user
        return total + 1;
      }
      return total;
    }, 0);
  }, [selectedItems]);

  const handleInvite = async () => {
    if (selectedItems.length === 0) return;

    const batchRequest = {
      items: selectedItems.map((item) => ({
        id: item.id,
        type: item.type,
        role: item.role,
      })),
    };

    inviteMembers(batchRequest);
  };

  // Custom render function for multi-select options
  const renderOption = (option: MultiSelectOption) => {
    const member = option as MultiSelectOption & MemberSearchItem;
    return (
      <div className="flex items-center gap-3">
        {member.type === "user" ? (
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground">{member.name[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <Users className="h-4 w-4" />
          </div>
        )}
        <div>
          <div className="font-medium">{member.name}</div>
          {member.email && <div className="text-sm text-muted-foreground">{member.email}</div>}
          {member.memberCount && <div className="text-sm text-muted-foreground">{member.memberCount} members</div>}
        </div>
      </div>
    );
  };

  // Custom render function for selected badges - only show name and remove button
  const renderBadge = (option: MultiSelectOption, onRemove: () => void) => {
    const member = option as MultiSelectOption & MemberSearchItem;

    return (
      <div className="flex items-center gap-2 py-1 px-2 border rounded-lg bg-muted/50">
        <div className="flex items-center gap-1">
          {/* {member.type === "user" ? <User className="h-3 w-3" /> : <Users className="h-3 w-3" />} */}
          <span className="text-sm font-medium">{member.name}</span>
        </div>
        <button onClick={onRemove} className="hover:bg-muted rounded-full p-0.5">
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  };

  const handleCancel = () => {
    proceed?.(null);
  };

  return (
    <Dialog open={show} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">Invite people to join {subspaceName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selection Area */}
          <div className="space-y-3">
            <div className="flex gap-4">
              {/* MultiSelect on the left */}
              <div className="flex-1">
                <MultiSelect
                  options={multiSelectOptions}
                  selected={selectedOptions}
                  onSelectionChange={handleSelectionChange}
                  placeholder="Select member or member group"
                  searchPlaceholder="Search members..."
                  renderOption={renderOption}
                  renderBadge={renderBadge}
                  searchValue={searchQuery}
                  onSearchChange={setSearchQuery}
                  filterOptions={(options, searchValue) => {
                    // No need to call setSearchQuery here anymore since it's handled by onSearchChange
                    return options.filter((option) => option.label.toLowerCase().includes(searchValue.toLowerCase()));
                  }}
                />
              </div>

              {/* Single role selector on the right */}
              {
                <div className="w-32 space-y-2">
                  <Select value={selectedRole} onValueChange={handleRoleChange}>
                    <SelectTrigger className="w-full h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              }
            </div>
          </div>

          {/* Loading State */}
          {searchLoading || subspaceMembersLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading members...</span>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={inviteLoading}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={selectedItems.length === 0 || inviteLoading}>
            {inviteLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Inviting...
              </>
            ) : (
              `Invite`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Create the confirm modal
export const showSubspaceInviteModal = ContextAwareConfirmation.createConfirmation(confirmable(SubspaceInviteModal));
