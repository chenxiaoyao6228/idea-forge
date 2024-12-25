import { Link } from "react-router-dom";
import { useDocumentStore } from "../doc/store";
import Slogan from "./slogan";
import { User, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import useUserStore from "@/stores/user";
import HomeNav from "./nav";
import HomeLogo from "@/assets/imgs/home-logo.png";

export default function Home() {
  return (
    <>
      <HomeNav />
      <main className="min-h-screen flex flex-col justify-center text-center ">
        <h2 className="scroll-m-20 text-4xl tracking-tight lg:text-5xl">
          <span className="font-extrabold">Work less, Create more</span>
        </h2>
        <div className="mt-6">
          <Slogan />
        </div>
        <section className="mt-6 flex justify-center space-x-4">
          <MainButton />
        </section>
        <div className="flex justify-center mt-6">
          <img src={HomeLogo} width={3751} height={2138} alt="home-logo" className="h-[300px] w-auto bg-white rounded-lg" />
        </div>
      </main>
    </>
  );
}

function MainButton() {
  const userInfo = useUserStore((state) => state.userInfo);
  if (userInfo == null) {
    return (
      <Link to="/login">
        <Button className="text-base" size="lg">
          <User className="h-4 w-4" />
          &nbsp;Login / Register
        </Button>
      </Link>
    );
  }

  const lastDocId = useDocumentStore.use.lastDocId();
  const url = lastDocId ? `/doc/${lastDocId}` : "/doc/0";
  return (
    <Link to={url}>
      <Button className="text-base px-6" size="lg">
        <Zap className="h-4 w-4" />
        Get Started
      </Button>
    </Link>
  );
}
