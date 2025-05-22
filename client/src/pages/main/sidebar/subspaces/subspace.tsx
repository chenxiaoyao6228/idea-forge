import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, FolderIcon, MoreHorizontalIcon, PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AddDocButton } from "./add-doc-button";
import { NavigationNode, SubspaceState, useSubspace } from "@/stores/subspace-store";
import { FileNavigationItem } from "../components/file-navigation-item";
import { NavigationItem } from "../components/navigation-item";

interface SubspaceProps {
  subspaceId: string;
}

export function SubspaceComp({ subspaceId }: SubspaceProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { docId: curDocId } = useParams();
  const { t } = useTranslation();
  const { avatar, name, navigationTree, expandedKeys, setExpandedKeys, fetchChildDocuments } = useSubspace(subspaceId);

  const getWorkspaceInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : "W";
  };

  useEffect(() => {
    fetchChildDocuments(null);
  }, []);

  const renderTreeNode = (node: NavigationNode) => {
    const isFolder = !node.isLeaf;

    if (isFolder) {
      return (
        <NavigationItem
          icon={<FolderIcon className="h-4 w-4" />}
          label={node.title}
          expanded={expandedKeys.includes(node.id)}
          onDisclosureClick={() => {
            const newKeys = expandedKeys.includes(node.id) ? expandedKeys.filter((k) => k !== node.id) : [...expandedKeys, node.id];
            setExpandedKeys(newKeys);
            if (!node.children.length) {
              fetchChildDocuments(node.id);
            }
          }}
          menu={
            <div className="flex items-center">
              <AddDocButton parentId={node.id} subspaceId={subspaceId} />
            </div>
          }
        >
          {node.children.map((child) => renderTreeNode(child))}
        </NavigationItem>
      );
    }

    return (
      <FileNavigationItem
        document={node}
        active={curDocId === node.id}
        depth={1}
        menu={
          <div className="flex items-center">
            <AddDocButton parentId={node.id} subspaceId={subspaceId} />
          </div>
        }
      />
    );
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild className="flex items-center px-2 py-1">
        <div className="flex items-center">
          <div className="flex items-center flex-1">
            <Avatar className="h-6 w-6 mr-[2px] ">
              {avatar ? <AvatarImage src={avatar} alt={name} /> : <AvatarFallback>{getWorkspaceInitial(name || "")}</AvatarFallback>}
            </Avatar>
            <span className="truncate user-select-none text-sm mr-[2px]">{name}</span>
            <div className="flex items-center cursor-pointer rounded h-4 w-4 hover:bg-accent/50 dark:hover:bg-accent/25 mr-2">
              <ChevronRight className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isExpanded && "rotate-90")} />
            </div>
          </div>
          <SubspaceAreaMoreOperations />
          <AddDocButton parentId={null} subspaceId={subspaceId} />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="pl-4 mt-1">{navigationTree.map((node) => renderTreeNode(node))}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function SubspaceAreaMoreOperations() {
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
