import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { confirmable, ContextAwareConfirmation, type ConfirmDialogProps } from "react-confirm";
import { workspaceApi } from "@/apis/workspace";
import { userApi } from "@/apis/user";
import MultipleSelector, { Option } from "@/components/ui/multi-selector";
import type { User } from "@idea/contracts";
import { displayUserName } from "@/lib/auth";
import useRequest from "@ahooksjs/use-request";
import useWorkspaceStore, { useWorkspaceMembers, useBatchAddWorkspaceMembers } from "@/stores/workspace-store";

export interface AddWorkspaceMemberModalProps {
  workspaceId: string;
  title?: string;
  description?: string;

  // react-confirm props
  show?: boolean;
  proceed?: (value: any) => void;
}

const AddWorkspaceMemberModal = ({
  show = false,
  proceed,
  workspaceId,
  title,
  description,
}: ConfirmDialogProps<AddWorkspaceMemberModalProps, { success: boolean; addedCount: number; errors?: any[] } | null>) => {
  const [selectedUsers, setSelectedUsers] = useState<Option[]>([]);
  const [selectedRole, setSelectedRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const { t } = useTranslation();

  // Get existing members from workspace store
  const workspaceMembers = useWorkspaceMembers();
  const existingMemberIds = useMemo(() => {
    return new Set(workspaceMembers.map((member: any) => member.userId));
  }, [workspaceMembers]);

  // Cache for search results to avoid duplicate API calls
  const searchCacheRef = useRef<Map<string, Option[]>>(new Map());

  // Create search function for MultipleSelector
  const searchUsers = async (query: string): Promise<Option[]> => {
    const cacheKey = query.toLowerCase().trim();

    // Check cache first
    if (searchCacheRef.current.has(cacheKey)) {
      return searchCacheRef.current.get(cacheKey)!;
    }
    try {
      const response = await userApi.search({
        query: query || "", // Allow empty queries for initial load
        page: 1,
        limit: 100,
        sortBy: "createdAt",
      });

      // Handle both possible response structures
      let users: User[] = [];
      if (response && typeof response === "object" && "data" in response) {
        users = (response.data as User[]) || [];
      } else {
        users = (response as User[]) || [];
      }

      const options = users.map((user) => ({
        value: user.id,
        label: `${displayUserName(user)} (${user.email})`,
        // Store additional user data as string properties for compatibility
        email: user.email,
        imageUrl: user.imageUrl || undefined,
        // Mark as disabled if user is already a workspace member
        disable: existingMemberIds.has(user.id),
      }));

      // Sort options: non-members first, then existing members
      const sortedOptions = options.sort((a, b) => {
        // If both are disabled or both are enabled, maintain alphabetical order
        if (a.disable === b.disable) {
          return a.label.localeCompare(b.label);
        }
        // Non-members (disable: false/undefined) come first
        return a.disable ? 1 : -1;
      });

      // Cache the results
      searchCacheRef.current.set(cacheKey, sortedOptions);

      return sortedOptions;
    } catch (error) {
      console.error("Failed to search users:", error);
      return [];
    }
  };

  // Reset state when modal opens
  useEffect(() => {
    if (show) {
      setSelectedUsers([]);
      setSelectedRole("MEMBER");
      // Clear search cache when modal opens to ensure fresh data
      searchCacheRef.current.clear();
    }
  }, [show]);

  const handleClose = () => {
    proceed?.(null);
  };

  // Use the new batch add hook
  const { loading: isAddingMembers, run: addMembers } = useBatchAddWorkspaceMembers();

  const handleSubmit = async () => {
    if (selectedUsers.length === 0) {
      toast.error(t("Please select at least one user"));
      return;
    }

    try {
      const result = await addMembers({
        workspaceId,
        members: selectedUsers.map((userOption) => ({
          userId: userOption.value,
          role: selectedRole,
        })),
      });

      // Check if the result indicates success
      if (result && result.success !== false) {
        proceed?.(result);
      } else {
        toast.error(t("Failed to add members"));
        proceed?.(null);
      }
    } catch (error) {
      console.error("Error adding members:", error);
      toast.error(t("Failed to add members"));
      proceed?.(null);
    }
  };

  return (
    <Dialog open={show} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title || t("Add Members to Workspace")}</DialogTitle>
          {description && <div className="text-sm text-muted-foreground">{description}</div>}
        </DialogHeader>

        <div className="space-y-4">
          {/* User Selection */}
          <div className="space-y-2">
            <Label>{t("Select Users")}</Label>
            <MultipleSelector
              value={selectedUsers}
              onChange={setSelectedUsers}
              onSearch={searchUsers}
              placeholder={t("Search and select users...")}
              disabled={isAddingMembers}
              triggerSearchOnFocus={true}
              delay={300}
              className="w-full"
              loadingIndicator={
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              }
              emptyIndicator={<div className="text-center py-4 text-sm text-muted-foreground">{t("No users found")}</div>}
            />
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label>{t("Role")}</Label>
            <Select value={selectedRole} onValueChange={(value: "MEMBER" | "ADMIN") => setSelectedRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">{t("Admin")}</SelectItem>
                <SelectItem value="MEMBER">{t("Member")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isAddingMembers}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={selectedUsers.length === 0 || isAddingMembers}>
            {isAddingMembers ? t("Adding...") : t("Add Members")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const showAddWorkspaceMemberModal = ContextAwareConfirmation.createConfirmation(confirmable(AddWorkspaceMemberModal));
