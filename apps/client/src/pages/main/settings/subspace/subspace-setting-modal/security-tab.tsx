import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SubspaceSettingsResponse } from "@idea/contracts";

interface SecurityTabProps {
  settings: SubspaceSettingsResponse;
  onSettingsChange: (settings: Partial<SubspaceSettingsResponse["subspace"]>) => void;
}

export function SecurityTab({ settings, onSettingsChange }: SecurityTabProps) {
  const { t } = useTranslation();

  const handleBooleanSettingChange = (key: keyof SubspaceSettingsResponse["subspace"], value: boolean) => {
    onSettingsChange({ [key]: value });
  };

  const handlePermissionChange = (key: keyof SubspaceSettingsResponse["subspace"], value: string) => {
    onSettingsChange({ [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Subspace Security */}
      <Card>
        <CardHeader>
          <CardTitle>{t("Subspace Security")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("Who can add subspace members")}</label>
            <Select value={settings.subspace.memberInvitePermission} onValueChange={(value) => handlePermissionChange("memberInvitePermission", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_MEMBERS">{t("All subspace members")}</SelectItem>
                <SelectItem value="ADMINS_ONLY">{t("Admins only")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{t("Who can edit subspace top-level directory")}</label>
            </div>
            <p className="text-sm text-muted-foreground">{t("Add, remove, sort top-level directory pages")}</p>
            <Select value={settings.subspace.topLevelEditPermission} onValueChange={(value) => handlePermissionChange("topLevelEditPermission", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_MEMBERS">{t("All subspace members")}</SelectItem>
                <SelectItem value="ADMINS_ONLY">{t("Admins only")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Page Security */}
      <Card>
        <CardHeader>
          <CardTitle>{t("Page Security")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{t("Prohibit public sharing of pages")}</label>
            </div>
            <p className="text-sm text-muted-foreground">{t("After enabling, members within the subspace will not be able to publicly share pages")}</p>
            <div className="flex items-center space-x-2">
              <Switch
                checked={!settings.subspace.allowPublicSharing}
                onCheckedChange={(checked) => handleBooleanSettingChange("allowPublicSharing", !checked)}
              />
              <span className="text-sm text-muted-foreground">{!settings.subspace.allowPublicSharing ? t("Enabled") : t("Disabled")}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{t("Prohibit adding collaborative guests")}</label>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("After enabling, members within the subspace will not be able to add collaborative guests to pages")}
            </p>
            <div className="flex items-center space-x-2">
              <Switch
                checked={!settings.subspace.allowGuestCollaborators}
                onCheckedChange={(checked) => handleBooleanSettingChange("allowGuestCollaborators", !checked)}
              />
              <span className="text-sm text-muted-foreground">{!settings.subspace.allowGuestCollaborators ? t("Enabled") : t("Disabled")}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{t("Prohibit export")}</label>
            </div>
            <p className="text-sm text-muted-foreground">{t("After enabling, members within the subspace will not be able to export pages")}</p>
            <div className="flex items-center space-x-2">
              <Switch checked={!settings.subspace.allowExport} onCheckedChange={(checked) => handleBooleanSettingChange("allowExport", !checked)} />
              <span className="text-sm text-muted-foreground">{!settings.subspace.allowExport ? t("Enabled") : t("Disabled")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help link */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>?</span>
        <span>{t("Learn about subspace security")}</span>
      </div>
    </div>
  );
}
