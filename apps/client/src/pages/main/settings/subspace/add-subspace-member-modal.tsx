import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useBatchAddSubspaceMembers } from "@/stores/subspace";
import { MultiSelectOption } from "@/components/ui/multi-select";
import { MemberAndGroupSelect } from "@/components/member-group-select";
import { confirmable, ContextAwareConfirmation, type ConfirmDialogProps } from "react-confirm";

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

const AddSubspaceMemberModal = ({
  show = false,
  proceed,
  subspaceId,
  subspaceName,
  workspaceId,
  title,
  description,
}: ConfirmDialogProps<AddSubspaceMemberModalProps, { success: boolean; addedCount: number; errors?: any[] } | null>) => {
  const [selectedItems, setSelectedItems] = useState<MultiSelectOption[]>([]);
  const [selectedRole, setSelectedRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const { t } = useTranslation();

  // Get custom hook
  const { run: batchAddSubspaceMembers, loading: isAddingMembers } = useBatchAddSubspaceMembers();

  // Reset state when modal opens
  useEffect(() => {
    if (show) {
      setSelectedItems([]);
      setSelectedRole("MEMBER");
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

    try {
      const response = await batchAddSubspaceMembers({
        subspaceId,
        items: selectedItems.map((item) => ({
          id: item.id,
          type: item.type,
          role: selectedRole,
        })),
      });

      if (response.success) {
        const result: { success: boolean; addedCount: number; errors?: any[]; skipped?: any[] } = {
          success: true,
          addedCount: response.addedCount,
          errors: response.errors,
          skipped: response.skipped,
        };
        proceed?.(result);
      } else {
        proceed?.(null);
      }
    } catch (error) {
      console.error("Error adding members:", error);
      proceed?.(null);
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
            <MemberAndGroupSelect
              workspaceId={workspaceId}
              subspaceId={subspaceId}
              selectedItems={selectedItems}
              onSelectionChange={setSelectedItems}
              placeholder={t("Select member or member group")}
              searchPlaceholder={t("Search members or groups...")}
              disabled={isAddingMembers}
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
          <Button onClick={handleSubmit} disabled={selectedItems.length === 0 || isAddingMembers}>
            {isAddingMembers ? t("Adding...") : t("Add Members")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const showAddSubspaceMemberModal = ContextAwareConfirmation.createConfirmation(confirmable(AddSubspaceMemberModal));
