import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HelpCircle, Search, UserPlus, Users } from "lucide-react";
import { SubspaceSettingsResponse, PermissionLevel } from "@idea/contracts";
import { SubspaceTypeSelector } from "../subspace-type-selector";
import { PermissionLevelSelector } from "@/components/ui/permission-level-selector";

interface MembersPermissionsTabProps {
  settings: SubspaceSettingsResponse;
  onSettingsChange: (settings: Partial<SubspaceSettingsResponse["subspace"]>) => void;
  onAddMember: () => void;
}

export function MembersPermissionsTab({ settings, onSettingsChange, onAddMember }: MembersPermissionsTabProps) {
  const { t } = useTranslation();

  const handleTypeChange = (type: any) => {
    // Auto-set initial permissions based on subspace type
    const permissionUpdates = getInitialPermissionsForSubspaceType(type);
    onSettingsChange({ type, ...permissionUpdates });
  };

  // Helper function to get initial permissions based on subspace type
  const getInitialPermissionsForSubspaceType = (subspaceType: string) => {
    switch (subspaceType) {
      case "WORKSPACE_WIDE":
        return {
          subspaceAdminPermission: "OWNER" as PermissionLevel,
          subspaceMemberPermission: "OWNER" as PermissionLevel,
          // Non-subspace member permissions are not applicable for WORKSPACE_WIDE
        };
      case "PUBLIC":
        return {
          subspaceAdminPermission: "OWNER" as PermissionLevel,
          subspaceMemberPermission: "OWNER" as PermissionLevel,
          nonSubspaceMemberPermission: "COMMENT" as PermissionLevel,
        };
      case "INVITE_ONLY":
        return {
          subspaceAdminPermission: "OWNER" as PermissionLevel,
          subspaceMemberPermission: "OWNER" as PermissionLevel,
          nonSubspaceMemberPermission: "NONE" as PermissionLevel,
        };
      case "PRIVATE":
        return {
          subspaceAdminPermission: "OWNER" as PermissionLevel,
          subspaceMemberPermission: "OWNER" as PermissionLevel,
          nonSubspaceMemberPermission: "NONE" as PermissionLevel,
        };
      default:
        return {};
    }
  };

  const handlePermissionChange = (permissionType: string, value: PermissionLevel) => {
    // Validate permission changes
    if (validatePermissionChange(permissionType, value)) {
      onSettingsChange({ [permissionType]: value });
    }
  };

  // Validation function to prevent invalid permission combinations
  const validatePermissionChange = (permissionType: string, newValue: PermissionLevel): boolean => {
    const currentSettings = settings.subspace;

    // Subspace administrators should always have OWNER permissions
    if (permissionType === "subspaceAdminPermission" && newValue !== "OWNER") {
      console.warn("Subspace administrators must have OWNER permissions");
      return false;
    }

    // Non-members should not have higher permissions than members
    if (permissionType === "nonSubspaceMemberPermission") {
      const memberPermission = currentSettings.subspaceMemberPermission;
      if (newValue === "OWNER" || newValue === "MANAGE") {
        console.warn("Non-subspace members cannot have higher permissions than subspace members");
        return false;
      }
    }

    // Members should not have lower permissions than non-members (except for NONE)
    if (permissionType === "subspaceMemberPermission") {
      const nonMemberPermission = currentSettings.nonSubspaceMemberPermission;
      if (nonMemberPermission !== "NONE" && newValue === "NONE") {
        console.warn("Subspace members should have at least READ permissions");
        return false;
      }
    }

    return true;
  };

  return (
    <div className="space-y-6 custom-scrollbar">
      {/* Permissions Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t("Permissions")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 flex items-center gap-4">
            <label htmlFor="subspace-type" className="text-sm font-medium">
              {t("Subspace Type")}
            </label>
            <SubspaceTypeSelector
              id="subspace-type"
              value={settings.subspace.type}
              onChange={handleTypeChange}
              disabled={!settings.permissions.canChangeType}
            />
          </div>

          {/* Role-based permissions display */}
          <div className="space-y-3">
            {/* Subspace Administrator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">{t("Subspace Administrator")}</span>
              </div>
              <PermissionLevelSelector
                value={settings.subspace.subspaceAdminPermission}
                onChange={(value) => handlePermissionChange("subspaceAdminPermission", value)}
                disabled={true} // Always disabled as per requirements
              />
            </div>

            {/* Subspace Member */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">{t("Subspace Member")}</span>
              </div>
              <PermissionLevelSelector
                value={settings.subspace.subspaceMemberPermission}
                onChange={(value) => handlePermissionChange("subspaceMemberPermission", value)}
                disabled={!settings.permissions.canEditSettings}
              />
            </div>

            {/* Others outside the Subspace */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">{t("Others outside the Subspace")}</span>
              </div>
              <PermissionLevelSelector
                value={settings.subspace.nonSubspaceMemberPermission}
                onChange={(value) => handlePermissionChange("nonSubspaceMemberPermission", value)}
                disabled={!settings.permissions.canEditSettings || settings.subspace.type === "WORKSPACE_WIDE"}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
            <span>{t("Learn about subspace permissions")}</span>
          </div>
        </CardContent>
      </Card>

      {/* Members Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t("Members")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t("Search members and member groups")} className="pl-10" />
            </div>
            <Button onClick={onAddMember} className="bg-red-500 hover:bg-red-600">
              <UserPlus className="h-4 w-4 mr-2" />
              {t("Add Member")}
            </Button>
          </div>

          {/* Members list placeholder */}
          <div className="space-y-2">
            {settings.subspace.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    {member.user.displayName?.[0] || member.user.email[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{member.user.displayName || member.user.email}</div>
                    <div className="text-sm text-muted-foreground">{member.user.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{t("Subspace Administrator")}</span>
                  <span className="text-muted-foreground">...</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FIXME: if you remove this, a wierd gap shows up at the top of the modal */}
      <div className="h-10"></div>
    </div>
  );
}
