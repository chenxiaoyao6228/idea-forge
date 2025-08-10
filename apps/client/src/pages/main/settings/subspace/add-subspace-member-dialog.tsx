import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import useSubSpaceStore from "@/stores/subspace";
import { MultiSelectOption } from "@/components/ui/multi-select";
import { SubspaceMemberSelect } from "@/components/subspace-member-select";

interface AddSubspaceMemberDialogProps {
  subspaceId: string;
  subspaceName: string;
  workspaceId: string;
  children: React.ReactNode;
  onSuccess?: () => void;
}

export function AddSubspaceMemberDialog({ subspaceId, subspaceName, workspaceId, children, onSuccess }: AddSubspaceMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<MultiSelectOption[]>([]);
  const [selectedRole, setSelectedRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  // Get store methods
  const batchAddSubspaceMembers = useSubSpaceStore((state) => state.batchAddSubspaceMembers);

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when dialog closes
      setSelectedItems([]);
      setSelectedRole("MEMBER");
      setLoading(false);
    }
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
        if (response.addedCount > 0) {
          toast.success(t("Successfully added {{count}} member(s)", { count: response.addedCount }));
        }

        if (response.errors && response.errors.length > 0) {
          const errorMessages = response.errors.map((error) => `${error.type === "user" ? "User" : "Group"} ${error.id}: ${error.error}`).join(", ");
          toast.error(t("Some items failed to add: {{errors}}", { errors: errorMessages }));
        }

        // Close dialog and call onSuccess
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error(t("Failed to add members"));
      }
    } catch (error) {
      console.error("Error adding members:", error);
      toast.error(t("Failed to add members"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("Invite people to")} {subspaceName}
          </DialogTitle>
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

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={selectedItems.length === 0 || loading}>
              {loading ? t("Adding...") : t("Add Members")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
