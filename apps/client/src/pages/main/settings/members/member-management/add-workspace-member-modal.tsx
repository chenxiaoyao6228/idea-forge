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
      }));

      // Cache the results
      searchCacheRef.current.set(cacheKey, options);

      return options;
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

  // Use useRequest for adding members
  const { loading: isAddingMembers, run: addMembers } = useRequest(
    async () => {
      if (selectedUsers.length === 0) {
        throw new Error(t("Please select at least one user"));
      }

      let addedCount = 0;
      const errors: any[] = [];

      // Add each selected user
      for (const userOption of selectedUsers) {
        try {
          await workspaceApi.addWorkspaceMember(workspaceId, {
            userId: userOption.value,
            role: selectedRole,
          });
          addedCount++;
        } catch (error: any) {
          errors.push({
            id: userOption.value,
            email: userOption.email || userOption.label,
            error: error?.response?.data?.message || error?.message || t("Failed to add member"),
          });
        }
      }

      if (addedCount > 0) {
        toast.success(t("Successfully added {{count}} member(s)", { count: addedCount }));
      }

      if (errors.length > 0) {
        const errorMessages = errors.map((error) => `${error.email}: ${error.error}`).join(", ");
        toast.error(t("Some users failed to add: {{errors}}", { errors: errorMessages }));
      }

      return {
        success: true,
        addedCount,
        errors: errors.length > 0 ? errors : undefined,
      };
    },
    {
      manual: true,
      onSuccess: (result) => {
        proceed?.(result);
      },
      onError: (error) => {
        console.error("Error adding members:", error);
        toast.error(error.message || t("Failed to add members"));
        proceed?.(null);
      },
    },
  );

  const handleSubmit = () => {
    addMembers();
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
