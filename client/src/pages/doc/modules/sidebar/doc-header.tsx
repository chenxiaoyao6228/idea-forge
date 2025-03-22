import { useEffect, useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/theme-switcher";
import DocumentBreadcrumb from "./doc-breadcrumb";
import { ShareDocButton } from "./share-doc-button";
import { CollabUsers } from "@/pages/doc/components/collab-users";
import { useTranslation } from "react-i18next";
import ExportMarkdownButton from "../../components/export-markdown-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Ellipsis } from "lucide-react";
import { useScrollTop } from "@/hooks/use-scroll-top";
import ImportMarkdownButton from "../../components/import-markdown";
import { Separator } from "@/components/ui/separator";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function DocumentHeader() {
  const { t } = useTranslation();

  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setScrollContainer(document.getElementsByClassName("main")[0] as HTMLElement);
  }, []);

  const scrolled = useScrollTop(10, scrollContainer || undefined);

  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 justify-between bg-background",
        scrolled ? "border-b shadow-sm" : "",
      )}
    >
      {/* left */}
      <div className="flex items-center gap-2 px-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger className="-ml-1" />
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start">
            {t("Toggle Sidebar")}
            {/* <kbd className="ml-2">⌘+b</kbd> */}
          </TooltipContent>
        </Tooltip>
        <DocumentBreadcrumb />
      </div>
      {/* right */}
      <div className="flex items-center mr-2 sm:mr-4 ">
        <CollabUsers className="mr-2" />
        <ShareDocButton />
        <TopBarHandlers />
      </div>
    </header>
  );
}

function TopBarHandlers() {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon">
          <Ellipsis className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-42 py-1 px-2" align="end">
        <ThemeSwitcher onSelect={() => setOpen(false)} />
        <Separator className="my-1" />
        <LanguageSwitcher onSelect={() => setOpen(false)} />
        <Separator className="my-1" />
        <ExportMarkdownButton />
        <Separator className="my-1" />
        <ImportMarkdownButton />
      </PopoverContent>
    </Popover>
  );
}
