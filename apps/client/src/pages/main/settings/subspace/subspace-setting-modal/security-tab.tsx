import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from '@idea/ui/shadcn/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@idea/ui/shadcn/ui/select';
import { Switch } from '@idea/ui/shadcn/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@idea/ui/shadcn/ui/tooltip';
import { SubspaceSettingsResponse } from "@idea/contracts";
import { useAbilityCan, Action } from "@/hooks/use-ability";

interface SecurityTabProps {
  settings: SubspaceSettingsResponse;
  onSettingsChange: (settings: Partial<SubspaceSettingsResponse["subspace"]>) => void;
}

export function SecurityTab({ settings, onSettingsChange }: SecurityTabProps) {
  const { t } = useTranslation();

  // Permission checks
  const subspaceSubject = { id: settings.subspace.id };
  const { can: canManageSubspaceSettings } = useAbilityCan("Subspace", Action.ManageSettings, subspaceSubject);

  const handleBooleanSettingChange = (key: keyof SubspaceSettingsResponse["subspace"], value: boolean) => {
    onSettingsChange({ [key]: value });
  };

  const handlePermissionChange = (key: keyof SubspaceSettingsResponse["subspace"], value: string) => {
    onSettingsChange({ [key]: value });
  };

  return (
    <div className="space-y-6 custom-scrollbar">
      {/* Subspace Security */}
      <Card>
        <CardHeader>
          <CardTitle>{t("Subspace Security")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <label htmlFor="memberInvitePermission" className="text-sm font-medium">
              {t("Who can add subspace members")}
            </label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Select
                      value={settings.subspace.memberInvitePermission}
                      onValueChange={(value) => handlePermissionChange("memberInvitePermission", value)}
                      disabled={!canManageSubspaceSettings || (settings.subspace.type !== "INVITE_ONLY" && settings.subspace.type !== "PRIVATE")}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL_MEMBERS">{t("All subspace members")}</SelectItem>
                        <SelectItem value="ADMINS_ONLY">{t("Admins only")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TooltipTrigger>
                {settings.subspace.type !== "INVITE_ONLY" && settings.subspace.type !== "PRIVATE" && (
                  <TooltipContent className="max-w-xs">
                    <p>
                      {t(
                        'After changing the subspace type to "Private Subspace" or "Invite Subspace", you can change the "Who can add subspace members" setting',
                      )}
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="topLevelEditPermission" className="text-sm font-medium">
                {t("Who can edit subspace top-level directory")}
              </label>
              <Select
                value={settings.subspace.topLevelEditPermission}
                onValueChange={(value) => handlePermissionChange("topLevelEditPermission", value)}
                disabled={!canManageSubspaceSettings}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_MEMBERS">{t("All subspace members")}</SelectItem>
                  <SelectItem value="ADMINS_ONLY">{t("Admins only")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">{t("Add, remove, sort top-level directory pages")}</p>
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
            <div className="flex items-center justify-between">
              <label htmlFor="allowExport" className="text-sm font-medium">
                {t("Disable export")}
              </label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="allowExport"
                  checked={!settings.subspace.allowExport}
                  onCheckedChange={(checked) => handleBooleanSettingChange("allowExport", !checked)}
                  disabled={!canManageSubspaceSettings}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{t("Prevents members from exporting pages from this subspace")}</p>
          </div>
        </CardContent>
      </Card>

      {/* FIXME: if you remove this, a wierd gap shows up at the top of the modal */}
      <div className="h-10"></div>
    </div>
  );
}
