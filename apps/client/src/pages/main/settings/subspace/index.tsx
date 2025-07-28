import React from "react";
import { useTranslation } from "react-i18next";

export const Subspace = () => {
  const { t } = useTranslation("common");
  return <div>{t("Subspace")}</div>;
};
