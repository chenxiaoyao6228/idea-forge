import React from "react";
import { useTranslation } from "react-i18next";

export const Account = () => {
  const { t } = useTranslation("common");
  return <div>{t("Account")}</div>;
};
