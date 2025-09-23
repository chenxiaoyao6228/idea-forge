import { Link, useLocation } from "react-router-dom";
import Slogan from "./slogan";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import HomeNav from "../../components/header";
import HomeLogo from "@/assets/imgs/home-logo.png";
import { useTranslation } from "react-i18next";

export default function Marketing() {
  const { t } = useTranslation();
  return (
    <>
      <HomeNav />
      <main className="min-h-screen flex flex-col justify-center text-center ">
        <h2 className="scroll-m-20 text-4xl tracking-tight lg:text-5xl">
          <span className="font-extrabold">{t("Work less, Create more")}</span>
        </h2>
        <div className="mt-6">
          <Slogan />
        </div>
        <section className="mt-6 flex justify-center space-x-4">
          <Link to={`/register${location.search}`}>
            <Button className="text-base" size="lg">
              <User className="h-4 w-4" />
              &nbsp;{t("Login / Register")}
            </Button>
          </Link>
        </section>
        <div className="flex justify-center mt-6">
          <img src={HomeLogo} width={3751} height={2138} alt={t("Home Logo")} className="h-[300px] w-auto bg-white rounded-lg" />
        </div>
      </main>
    </>
  );
}
