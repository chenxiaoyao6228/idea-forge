import { SidebarTrigger } from "@/components/ui/sidebar.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useDocumentStore } from "../store";
import DocumentBreadcrumb from "./doc-breadcrumb";

export default function DocumentHeader() {
  const selectedKeys = useDocumentStore.use.selectedKeys();

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
        {selectedKeys.length > 0 && <Separator orientation="vertical" className="mr-2 h-4" />}
        <DocumentBreadcrumb />
      </div>
      {/* right */}
      <div className="mr-2 sm:mr-4">
        <ThemeSwitcher />
      </div>
    </header>
  );
}
