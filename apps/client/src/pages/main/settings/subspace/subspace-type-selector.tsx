import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { SubspaceType } from "@idea/contracts";
import { cx } from "class-variance-authority";

interface SubspaceTypeSelectorProps {
  value: SubspaceType;
  onChange: (value: SubspaceType) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function SubspaceTypeSelector({ value, onChange, disabled = false, className, id }: SubspaceTypeSelectorProps) {
  const { t } = useTranslation();

  const subspaceTypes = [
    {
      value: "WORKSPACE_WIDE" as SubspaceType,
      label: t("Workspace-wide Space"),
      description: t("All workspace members are automatically members"),
    },
    {
      value: "PUBLIC" as SubspaceType,
      label: t("Public Space"),
      description: t("All members can actively join"),
    },
    {
      value: "INVITE_ONLY" as SubspaceType,
      label: t("Invite Space"),
      description: t("Requires invitation to join"),
    },
    {
      value: "PRIVATE" as SubspaceType,
      label: t("Private Space"),
      description: t("Only visible to invited members"),
      // badge: t("Team Edition"),
    },
  ];

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cx("w-auto min-w-[200px]", className)} id={id}>
        <SelectValue placeholder={t("Select subspace type")} />
      </SelectTrigger>
      <SelectContent>
        {subspaceTypes.map((type) => (
          <SelectItem key={type.value} value={type.value}>
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span>{type.label}</span>
                  {/* {type.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {type.badge}
                    </Badge>
                  )} */}
                </div>
                {/* <span className="text-xs text-muted-foreground">{type.description}</span> */}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
