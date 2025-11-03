import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@idea/ui/shadcn/ui/card';
import { Switch } from '@idea/ui/shadcn/ui/switch';
import { Label } from '@idea/ui/shadcn/ui/label';
import useWorkspaceStore, { useUpdateWorkspace } from "@/stores/workspace-store";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface WorkspaceSubspaceSettingsProps {
  workspaceId: string;
}

export function WorkspaceSubspaceSettings({ workspaceId }: WorkspaceSubspaceSettingsProps) {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const { run: updateWorkspace } = useUpdateWorkspace();

  /*
   * Logic explanation:
   * - memberSubspaceCreate: Workspace field, true=allow members to create subspaces, false=prevent members from creating subspaces
   * - Switch checked: UI switch state, true=prevent creation, false=allow creation
   * - Relationship: Switch.checked = !memberSubspaceCreate
   * - When user enables switch, checked=true, means prevent creation, so memberSubspaceCreate=false
   */

  const handleMemberSubspaceCreateChange = async (checked: boolean) => {
    if (!currentWorkspace) return;

    setLoading(true);
    try {
      // checked being true means "prevent members from creating subspaces"
      // memberSubspaceCreate being false means "prevent members from creating subspaces"
      // so checked and memberSubspaceCreate have an inverse relationship
      await updateWorkspace({
        workspaceId,
        workspace: {
          memberSubspaceCreate: !currentWorkspace.memberSubspaceCreate, // when switch is on, prevent member creation
        },
      });
      toast.success(t("Settings updated"));
    } catch (error) {
      console.error("Failed to update workspace settings:", error);
      toast.error(t("Failed to update settings"));
    } finally {
      setLoading(false);
    }
  };

  if (!currentWorkspace) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent>
          <div className="flex items-center justify-between pt-4">
            <div className="space-y-1">
              <Label htmlFor="member-subspace-create" className="text-base">
                {t("Disable member subspace creation")}
              </Label>
              <p className="text-sm text-muted-foreground">{t("After enabling, only administrators can create new subspaces")}</p>
            </div>
            <Switch
              id="member-subspace-create"
              checked={!currentWorkspace?.memberSubspaceCreate} // When memberSubspaceCreate is false, switch is true (creation disabled)
              onCheckedChange={handleMemberSubspaceCreateChange}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
