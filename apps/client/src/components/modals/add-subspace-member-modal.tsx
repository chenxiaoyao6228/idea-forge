import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import useSubSpaceStore from "@/stores/subspace";
import { MultiSelectOption } from "@/components/ui/multi-select";
import { SubspaceMemberSelect } from "@/components/subspace-member-select";
import { confirmable, ConfirmDialog } from "react-confirm";
import { createConfirmation } from "react-confirm";

export interface AddSubspaceMemberModalProps {
  subspaceId: string;
  subspaceName: string;
  workspaceId: string;
  title?: string;
  description?: string;

  // react-confirm props
  show?: boolean;
  proceed?: (value: any) => void;
}

const AddSubspaceMemberModal: ConfirmDialog<AddSubspaceMemberModalProps, any> = ({
  show = false,
  proceed,
  subspaceId,
  subspaceName,
  workspaceId,
  title,
  description,
}) => {
  const [selectedItems, setSelectedItems] = useState<MultiSelectOption[]>([]);
  const [selectedRole, setSelectedRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  // Get store methods
  const batchAddSubspaceMembers = useSubSpaceStore((state) => state.batchAddSubspaceMembers);

  // Reset state when modal opens
  useEffect(() => {
    if (show) {
      setSelectedItems([]);
      setSelectedRole("MEMBER");
      setLoading(false);
    }
  }, [show]);

  const handleClose = () => {
    proceed?.(null);
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.error(t("Please select at least one member or group"));
      return;
    }

    setLoading(true);
    try {
      const response = await batchAddSubspaceMembers(
        subspaceId,
        selectedItems.map((item) => ({
          id: item.id,
          type: item.type,
          role: selectedRole,
        })),
      );

      if (response.success) {
        const result: { success: boolean; addedCount: number; errors?: any[] } = {
          success: true,
          addedCount: response.addedCount,
        };

        if (response.addedCount > 0) {
          toast.success(t("Successfully added {{count}} member(s)", { count: response.addedCount }));
        }

        if (response.errors && response.errors.length > 0) {
          const errorMessages = response.errors.map((error) => `${error.type === "user" ? "User" : "Group"} ${error.id}: ${error.error}`).join(", ");
          toast.error(t("Some items failed to add: {{errors}}", { errors: errorMessages }));
          result.errors = response.errors;
        }

        // Return result to caller
        proceed?.(result);
      } else {
        toast.error(t("Failed to add members"));
        proceed?.(null);
      }
    } catch (error) {
      console.error("Error adding members:", error);
      toast.error(t("Failed to add members"));
      proceed?.(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={show} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title || `${t("Invite people to")} ${subspaceName}`}</DialogTitle>
          {description && <div className="text-sm text-muted-foreground">{description}</div>}
        </DialogHeader>

        <div className="space-y-4">
          {/* MultiSelect for Users and Groups */}
          <div className="space-y-2">
            <Label>{t("Select member or member group")}</Label>
            <SubspaceMemberSelect
              workspaceId={workspaceId}
              subspaceId={subspaceId}
              selectedItems={selectedItems}
              onSelectionChange={setSelectedItems}
              placeholder={t("Select member or member group")}
              searchPlaceholder={t("Search members or groups...")}
              disabled={loading}
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
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={selectedItems.length === 0 || loading}>
            {loading ? t("Adding...") : t("Add Members")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const addSubspaceMemberModal = createConfirmation(confirmable(AddSubspaceMemberModal));
