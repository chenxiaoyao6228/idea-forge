import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { PermissionLevel } from "@idea/contracts";
import { cx } from "class-variance-authority";

interface PermissionLevelSelectorProps {
  value: PermissionLevel;
  onChange: (value: PermissionLevel) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function PermissionLevelSelector({ value, onChange, disabled = false, className, id }: PermissionLevelSelectorProps) {
  const { t } = useTranslation();

  const permissionLevels = [
    {
      value: "NONE" as PermissionLevel,
      label: t("No Access"),
      description: t("Cannot view or access content"),
      color: "destructive" as const,
    },
    {
      value: "READ" as PermissionLevel,
      label: t("View Only"),
      description: t("Can view content but cannot edit"),
      color: "secondary" as const,
    },
    {
      value: "COMMENT" as PermissionLevel,
      label: t("Comment"),
      description: t("Can view and comment on content"),
      color: "default" as const,
    },
    {
      value: "EDIT" as PermissionLevel,
      label: t("Edit"),
      description: t("Can view, comment, and edit content"),
      color: "default" as const,
    },
    {
      value: "MANAGE" as PermissionLevel,
      label: t("Manage"),
      description: t("Can manage content and settings"),
      color: "default" as const,
    },
  ];

  const selectedPermission = permissionLevels.find((level) => level.value === value);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cx("w-auto px-2", className)} id={id}>
        <SelectValue placeholder={t("Select permission level")}>
          {selectedPermission && (
            <div className="flex items-center gap-2">
              <span className="mr-1">{selectedPermission.label}</span>
              {selectedPermission.color === "destructive" && (
                <Badge variant="destructive" className="text-xs">
                  {t("Restricted")}
                </Badge>
              )}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {permissionLevels.map((level) => (
          <SelectItem key={level.value} value={level.value}>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{level.label}</span>
                {level.color === "destructive" && (
                  <Badge variant="destructive" className="text-xs">
                    {t("Restricted")}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{level.description}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
