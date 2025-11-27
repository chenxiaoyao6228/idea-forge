import { Button } from "@idea/ui/shadcn/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@idea/ui/shadcn/ui/tooltip";
import { useEffect, useState } from "react";
import { useScrollTop } from "@/hooks/use-scroll-top";
import { Rocket } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@idea/ui/shadcn/utils";
import useUIStore from "@/stores/ui-store";
import { COMMENT_SIDEBAR_WIDTH } from "./comments/comments-sidebar";

export default function BackToTop() {
  const { t } = useTranslation();
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null);
  const commentsSidebarOpen = useUIStore((state) => state.commentsSidebarOpen);

  useEffect(() => {
    // Try authenticated scroll container first, then public document container
    const container = document.getElementById("WORK_CONTENT_SCROLL_CONTAINER") || document.getElementById("PUBLIC_DOC_SCROLL_CONTAINER");
    setScrollContainer(container);
  }, []);

  const scrolled = useScrollTop(10, scrollContainer || undefined);

  const scrollToTop = () => {
    // Try authenticated scroll container first, then public document container
    const container = document.getElementById("WORK_CONTENT_SCROLL_CONTAINER") || document.getElementById("PUBLIC_DOC_SCROLL_CONTAINER");
    if (container) {
      container.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  if (!scrolled) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            onClick={scrollToTop}
            className={cn("fixed right-4 bottom-10 rounded-full px-2 z-50 transition-all duration-300 select-none")}
            style={{
              marginRight: commentsSidebarOpen ? `${COMMENT_SIDEBAR_WIDTH + 10}px` : "0px",
            }}
          >
            <Rocket className="h-8 w-8" style={{ transform: "rotate(-45deg)" }} />
          </Button>
        </TooltipTrigger>
        <TooltipContent align="center">
          <p>{t("Back to top")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
