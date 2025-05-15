import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, MoreHorizontalIcon, PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Subspace } from "contracts";

interface SubspaceProps {
  subspace: Subspace;
}

export function SubspaceComp({ subspace }: SubspaceProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getWorkspaceInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : "W";
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild className="flex items-center px-2">
        <div className="flex items-center">
          <div className="flex items-center flex-1">
            <Avatar className="h-6 w-6 mr-[2px] ">
              {subspace?.avatar ? (
                <AvatarImage src={subspace.avatar} alt={subspace.name} />
              ) : (
                <AvatarFallback>{getWorkspaceInitial(subspace?.name || "")}</AvatarFallback>
              )}
            </Avatar>
            <span className="truncate user-select-none text-sm mr-[2px]">{subspace.name}</span>
            <div className="flex items-center cursor-pointer rounded h-4 w-4 hover:bg-accent/50 dark:hover:bg-accent/25 mr-2">
              <ChevronRight className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isExpanded && "rotate-90")} />
            </div>
          </div>
          <MoreOperations />
          <AddDocButton />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="pl-4 mt-1">{/* 这里将来会放置子空间的文档树 */}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function AddDocButton() {
  const handleClick = () => {};
  return (
    <Button onClick={handleClick} variant="ghost" size="icon" className="h-4 w-4 p-0 cursor-pointer hover:bg-accent/50 dark:hover:bg-accent/25">
      <PlusIcon className="h-4 w-4" />
    </Button>
  );
}

function MoreOperations() {
  const { t } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const onDropdownOpenChange = (isOpen: boolean) => {
    setIsDropdownOpen(isOpen);
  };
  const onAddMembers = () => {};
  return (
    <DropdownMenu onOpenChange={onDropdownOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-4 w-4 p-0 mr-1 cursor-pointer hover:bg-accent/50 dark:hover:bg-accent/25">
          <MoreHorizontalIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={onAddMembers}>{t("Add members")}</DropdownMenuItem>
        <DropdownMenuItem>{t("Subspace setting")}</DropdownMenuItem>
        <DropdownMenuItem>{t("Leave subspace")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
