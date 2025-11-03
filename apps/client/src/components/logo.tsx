import { Link } from "react-router-dom";
import LogoImg from "../assets/imgs/logo.png";
import { useTranslation } from "react-i18next";

export default function Logo() {
  const { t } = useTranslation();
  return (
    <Link to="/" className="blog overflow-hidden flex items-center">
      <img src={LogoImg} alt="logo" className="w-6 h-6 rounded-full" />
      <span className="ml-2 font-bold text-xl">{t("Idea Forge")}</span>
    </Link>
  );
}
