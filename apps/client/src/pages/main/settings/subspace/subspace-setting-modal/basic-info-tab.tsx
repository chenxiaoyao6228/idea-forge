import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TooltipWrapper } from "@/components/tooltip-wrapper";
import { Home, Check, Archive, Trash2, ArrowLeft } from "lucide-react";
import useSubspaceStore, { useLeaveSubspace, useIsLastSubspaceAdmin, useUpdateSubspaceSettings } from "@/stores/subspace-store";
import { useAbilityCan, Action } from "@/hooks/use-ability";

interface BasicInfoTabProps {
  subspaceId: string;
  onTabChange?: (tab: string) => void;
  onLeaveSubspace?: () => void;
}

export function BasicInfoTab({ subspaceId, onTabChange, onLeaveSubspace }: BasicInfoTabProps) {
  const { t } = useTranslation();
  const { subspaceSettings } = useSubspaceStore();
  const { run: updateSubspaceSettings } = useUpdateSubspaceSettings(subspaceId);
  const { run: leaveSubspace, loading: isLeavingSubspace } = useLeaveSubspace();
  const isLastAdmin = useIsLastSubspaceAdmin(subspaceId);

  // Permission checks
  const subspaceSubject = { id: subspaceId };
  const { can: canUpdateSubspace } = useAbilityCan("Subspace", Action.Update, subspaceSubject);
  const { can: canDeleteSubspace } = useAbilityCan("Subspace", Action.Delete, subspaceSubject);
  const { can: canManageSubspaceSettings } = useAbilityCan("Subspace", Action.ManageSettings, subspaceSubject);

  const [isSaving, setIsSaving] = useState(false);
  const [localSettings, setLocalSettings] = useState({
    name: "",
    description: "",
  });

  // Initialize local settings when subspaceSettings are loaded
  useEffect(() => {
    if (subspaceSettings) {
      setLocalSettings({
        name: subspaceSettings.subspace.name,
        description: subspaceSettings.subspace.description || "",
      });
    }
  }, [subspaceSettings]);

  const handleNameChange = (value: string) => {
    setLocalSettings((prev) => ({ ...prev, name: value }));
  };

  const handleDescriptionChange = (value: string) => {
    setLocalSettings((prev) => ({ ...prev, description: value }));
  };

  const handleSave = async () => {
    if (!subspaceSettings) return;

    setIsSaving(true);
    try {
      await updateSubspaceSettings({
        settings: {
          name: localSettings.name,
          description: localSettings.description,
        },
      });
    } catch (error) {
      console.error("Failed to save basic info:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLeaveSubspace = async () => {
    try {
      await leaveSubspace({
        subspaceId,
      });
      onLeaveSubspace?.();
    } catch (error) {
      // Error is already handled by the hook (toast shown)
      // Component can add additional error handling if needed
    }
  };

  const handleArchiveSubspace = () => {
    // TODO: Implement archive subspace functionality
    console.log("Archive subspace placeholder");
  };

  const handleDeleteSubspace = () => {
    // TODO: Implement delete subspace functionality
    console.log("Delete subspace placeholder");
  };

  const handleSetPermissions = () => {
    onTabChange?.("members");
  };

  const hasChanges = subspaceSettings
    ? localSettings.name !== subspaceSettings.subspace.name || localSettings.description !== (subspaceSettings.subspace.description || "")
    : false;

  if (!subspaceSettings) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">{t("Loading settings...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Details Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t("Details")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar and Name */}
          <div className="space-y-2">
            <label htmlFor="subspace-name" className="text-sm font-medium">
              {t("Avatar & Name")}
            </label>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={subspaceSettings.subspace.avatar || undefined} />
                <AvatarFallback>
                  <Home className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <Input
                id="subspace-name"
                value={localSettings.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={t("Enter subspace name")}
                className="flex-1"
                disabled={!canUpdateSubspace}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="subspace-description" className="text-sm font-medium">
              {t("Description")}
            </label>
            <Textarea
              id="subspace-description"
              value={localSettings.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder={t("Please enter subspace description")}
              rows={3}
              disabled={!canUpdateSubspace}
            />
          </div>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={!hasChanges || isSaving || !canUpdateSubspace}>
            {isSaving ? t("Saving...") : t("Save")}
          </Button>
        </CardContent>
      </Card>

      {/* Permissions Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t("Permissions")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t("Public Space")}</span>
              </div>
              <p className="text-sm text-muted-foreground">{t("All members can actively join")}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleSetPermissions} disabled={!canManageSubspaceSettings}>
              {t("Set Permissions")}
            </Button>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <span className="text-sm">👥</span>
            </div>
            <div>
              <div className="text-sm font-medium">{t("Workspace Member Permissions")}</div>
              <div className="text-xs text-muted-foreground">{t("All members of the workspace have all page permissions")}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dangerous Operations */}
      <Card>
        <CardHeader>
          <CardTitle>{t("Dangerous Operations")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Leave Subspace */}
          <div className="flex items-center gap-3 p-3 border border-destructive/20 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <ArrowLeft className="h-4 w-4 text-destructive" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{t("Leave Subspace")}</div>
              <div className="text-xs text-muted-foreground">{t("Remove this subspace from my sidebar")}</div>
            </div>
            <TooltipWrapper
              disabled={isLastAdmin || subspaceSettings?.subspace.type === "WORKSPACE_WIDE"}
              tooltip={
                isLastAdmin
                  ? t("Cannot leave as the only admin")
                  : subspaceSettings?.subspace.type === "WORKSPACE_WIDE"
                    ? t("Cannot leave workspace-wide subspaces")
                    : ""
              }
            >
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/20 hover:bg-destructive/10"
                onClick={handleLeaveSubspace}
                disabled={isLeavingSubspace || isLastAdmin || subspaceSettings?.subspace.type === "WORKSPACE_WIDE"}
              >
                {isLeavingSubspace ? t("Leaving...") : t("Leave")}
              </Button>
            </TooltipWrapper>
          </div>

          {/* Archive Subspace */}
          <div className="flex items-center gap-3 p-3 border border-destructive/20 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <Archive className="h-4 w-4 text-destructive" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-destructive">{t("Archive Subspace")}</div>
              <div className="text-xs text-muted-foreground">
                {t("Remove this subspace from members' sidebars, and subspace settings and page content will become read-only mode")}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/20 hover:bg-destructive/10"
              disabled={!canDeleteSubspace}
              onClick={handleArchiveSubspace}
            >
              {t("Archive")}
            </Button>
          </div>

          {/* Delete Subspace */}
          <div className="flex items-center gap-3 p-3 border border-destructive/20 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <Trash2 className="h-4 w-4 text-destructive" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-destructive/80">{t("Delete Subspace")}</div>
              <div className="text-xs text-muted-foreground">{t("This will delete the subspace and all its permissions and member settings")}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/20 hover:bg-destructive/10"
              disabled={!canDeleteSubspace}
              onClick={handleDeleteSubspace}
            >
              {t("Delete")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
