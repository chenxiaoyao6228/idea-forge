import React from "react";
import { useTranslation } from "react-i18next";

export const Workspace = () => {
  const { t } = useTranslation("common");
  return <div>{t("Workspace")}</div>;
};
