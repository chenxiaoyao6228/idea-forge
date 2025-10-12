import { useTranslation } from "react-i18next";
import { SubspaceType } from "@idea/contracts";

export interface SubspaceTypeInfo {
  value: SubspaceType;
  label: string;
  description: string;
  shortLabel?: string;
}

export function useSubspaceLabels() {
  const { t } = useTranslation();

  const getSubspaceTypeLabel = (type: SubspaceType): string => {
    switch (type) {
      case SubspaceType.PUBLIC:
        return t("Public Space");
      case SubspaceType.INVITE_ONLY:
        return t("Invitation Space");
      case SubspaceType.PRIVATE:
        return t("Private Space");
      case SubspaceType.PERSONAL:
        return t("Personal Space");
      case SubspaceType.WORKSPACE_WIDE:
        return t("Workspace-wide Space");
      default:
        return type;
    }
  };

  const getSubspaceTypeShortLabel = (type: SubspaceType): string => {
    switch (type) {
      case SubspaceType.PUBLIC:
        return t("Public");
      case SubspaceType.INVITE_ONLY:
        return t("Invite only");
      case SubspaceType.PRIVATE:
        return t("Private");
      case SubspaceType.PERSONAL:
        return t("Personal");
      case SubspaceType.WORKSPACE_WIDE:
        return t("Workspace-wide");
      default:
        return type;
    }
  };

  const getSubspaceTypeDescription = (type: SubspaceType): string => {
    switch (type) {
      case SubspaceType.PUBLIC:
        return t("All members can actively join");
      case SubspaceType.INVITE_ONLY:
        return t("Requires invitation to join");
      case SubspaceType.PRIVATE:
        return t("Only visible to invited members");
      case SubspaceType.PERSONAL:
        return t("Personal workspace for individual use");
      case SubspaceType.WORKSPACE_WIDE:
        return t("All workspace members are automatically members");
      default:
        return "";
    }
  };

  const getSubspaceTypeInfo = (type: SubspaceType): SubspaceTypeInfo => {
    return {
      value: type,
      label: getSubspaceTypeLabel(type),
      description: getSubspaceTypeDescription(type),
      shortLabel: getSubspaceTypeShortLabel(type),
    };
  };

  const getAllSubspaceTypes = (): SubspaceTypeInfo[] => {
    return [
      {
        value: SubspaceType.WORKSPACE_WIDE,
        label: t("Workspace-wide Space"),
        description: t("All workspace members are automatically members"),
        shortLabel: t("Workspace-wide"),
      },
      {
        value: SubspaceType.PUBLIC,
        label: t("Public Space"),
        description: t("All members can actively join"),
        shortLabel: t("Public"),
      },
      {
        value: SubspaceType.INVITE_ONLY,
        label: t("Invite Space"),
        description: t("Requires invitation to join"),
        shortLabel: t("Invite only"),
      },
      {
        value: SubspaceType.PRIVATE,
        label: t("Private Space"),
        description: t("Only visible to invited members"),
        shortLabel: t("Private"),
      },
    ];
  };

  return {
    getSubspaceTypeLabel,
    getSubspaceTypeShortLabel,
    getSubspaceTypeDescription,
    getSubspaceTypeInfo,
    getAllSubspaceTypes,
  };
}
