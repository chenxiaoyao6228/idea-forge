import { useEffect, useState } from "react";
import { SidebarTrigger } from '@idea/ui/shadcn/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@idea/ui/shadcn/ui/tooltip';
import { cn } from '@idea/ui/shadcn/utils';
import { ThemeSwitcher } from "@/components/theme-switcher";
import DocumentBreadcrumb from "../../main/sidebar/doc-breadcrumb";
import { CollabUsers } from "@/pages/doc/components/collab-users";
import { useTranslation } from "react-i18next";
import ExportMarkdownButton from "./export-markdown-button";
import { Popover, PopoverContent, PopoverTrigger } from '@idea/ui/shadcn/ui/popover';
import { Button } from '@idea/ui/shadcn/ui/button';
import { Ellipsis, Share } from "lucide-react";
import { useScrollTop } from "@/hooks/use-scroll-top";
import ImportMarkdownButton from "./import-markdown";
import { Separator } from '@idea/ui/shadcn/ui/separator';
import { LanguageSwitcher } from "@/components/language-switcher";
import { SharePopover } from "@/pages/main/sharing";
import { StarButton } from "@/components/star-button";
import { useCurrentDocumentId } from "@/stores/document-store";

export default function DocumentHeader() {
  const activeDocumentId = useCurrentDocumentId();
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
        {activeDocumentId && <SharePopover documentId={activeDocumentId}></SharePopover>}
        {activeDocumentId && <StarButton documentId={activeDocumentId} showTooltip={true} size="sm" />}
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
        <Button variant="ghost" size="sm">
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
