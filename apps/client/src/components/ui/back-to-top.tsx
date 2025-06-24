import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { useScrollTop } from "@/hooks/use-scroll-top";
import { Icon } from "./icon";
import { useTranslation } from "react-i18next";

export default function BackToTop() {
  const { t } = useTranslation();
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setScrollContainer(document.getElementsByClassName("main")[0] as HTMLElement);
  }, []);

  const scrolled = useScrollTop(10, scrollContainer || undefined);

  const scrollToTop = () => {
    document.querySelector("main")!.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <>
      {scrolled && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" onClick={scrollToTop} className="fixed bottom-24 right-2 rounded-full px-2">
                <Icon name="RocketLine" className="h-8 w-8" />
              </Button>
            </TooltipTrigger>
            <TooltipContent align="center">
              <p>{t("Back to top")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </>
  );
}
