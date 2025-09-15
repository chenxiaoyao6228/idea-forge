import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HelpCircle, Search, UserPlus } from "lucide-react";
import { SubspaceSettingsResponse } from "@idea/contracts";
import { SubspaceTypeSelector } from "../subspace-type-selector";

interface MembersPermissionsTabProps {
  settings: SubspaceSettingsResponse;
  onSettingsChange: (settings: Partial<SubspaceSettingsResponse["subspace"]>) => void;
  onAddMember: () => void;
}

export function MembersPermissionsTab({ settings, onSettingsChange, onAddMember }: MembersPermissionsTabProps) {
  const { t } = useTranslation();

  const handleTypeChange = (type: any) => {
    onSettingsChange({ type });
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
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("Subspace Administrator")}</span>
              <span className="text-sm text-muted-foreground">{t("All Permissions")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("Subspace Member")}</span>
              <span className="text-sm text-muted-foreground">{t("All Permissions")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("Others outside the Subspace")}</span>
              <span className="text-sm text-muted-foreground">{t("All Permissions")}</span>
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
