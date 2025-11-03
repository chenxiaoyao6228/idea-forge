import { useTranslation } from "react-i18next";

function NotFound() {
  const { t } = useTranslation();
  return <div>{t("Not Found")}</div>;
}

export default NotFound;
