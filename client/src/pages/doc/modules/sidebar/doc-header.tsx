import { SidebarTrigger } from "@/components/ui/sidebar.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/theme-switcher";
import DocumentBreadcrumb from "./doc-breadcrumb";
import { ShareDocButton } from "./share-doc-button";
import { CollabUsers } from "@/pages/doc/components/collab-users";

export default function DocumentHeader() {
  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 justify-between bg-background",
      )}
    >
      {/* left */}
      <div className="flex items-center gap-2 px-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger className="-ml-1" />
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start">
            Toggle Sidebar <kbd className="ml-2">⌘+b</kbd>
          </TooltipContent>
        </Tooltip>
        <DocumentBreadcrumb />
      </div>
      {/* right */}
      <div className="flex items-center mr-2 sm:mr-4 ">
        <CollabUsers className="mr-2" />
        <ShareDocButton />
        <ThemeSwitcher />
      </div>
    </header>
  );
}
