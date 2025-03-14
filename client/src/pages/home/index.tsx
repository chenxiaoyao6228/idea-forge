import { Link } from "react-router-dom";
import Slogan from "./slogan";
import { User, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import useUserStore from "@/stores/user";
import HomeNav from "./nav";
import HomeLogo from "@/assets/imgs/home-logo.png";
import { documentApi } from "@/apis/document";
import { useEffect, useState } from "react";
import { useDocumentStore } from "../doc/stores/doc-store";
import { useTranslation } from "react-i18next";

export default function Home() {
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
          <MainButton />
        </section>
        <div className="flex justify-center mt-6">
          <img src={HomeLogo} width={3751} height={2138} alt={t("Home Logo")} className="h-[300px] w-auto bg-white rounded-lg" />
        </div>
      </main>
    </>
  );
}

function MainButton() {
  const userInfo = useUserStore((state) => state.userInfo);
  const lastDocId = useDocumentStore((state) => state.lastDocId);
  const [isLoading, setIsLoading] = useState(false);
  const setLastDocId = useDocumentStore((state) => state.setLastDocId);
  const { t } = useTranslation();

  useEffect(() => {
    async function fetchLastDoc() {
      if (!userInfo || lastDocId) return;

      setIsLoading(true);
      try {
        const { id } = await documentApi.getLatestDocument();
        setLastDocId(id);
      } catch (error) {
        console.error("Failed to fetch last document:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLastDoc();
  }, [userInfo, lastDocId]);

  if (userInfo == null) {
    return (
      <Link to="/login">
        <Button className="text-base" size="lg">
          <User className="h-4 w-4" />
          &nbsp;{t("Login / Register")}
        </Button>
      </Link>
    );
  }

  const url = lastDocId ? `/doc/${lastDocId}` : "/doc/0";
  return (
    <Link to={url}>
      <Button className="text-base px-6" size="lg" disabled={isLoading}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        {t("Get Started")}
      </Button>
    </Link>
  );
}
