import { SidebarTrigger } from "@/components/ui/sidebar.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useDocumentTree, treeUtils } from "../store";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useCallback } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Link } from "react-router-dom";

interface DocumentBreadcrumbProps {
  items: Array<{ id: string; title: string }>;
  onNavigate: (id: string) => void;
}

function DocumentBreadcrumb({ items, onNavigate }: DocumentBreadcrumbProps) {
  if (items.length > 3) {
    return (
      <>
        {/* First item */}
        <BreadcrumbItem>
          <BreadcrumbLink onClick={() => onNavigate(items[0].id)} className="cursor-pointer">
            {items[0].title}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />

        {/* Collapsed middle items */}
        <BreadcrumbItem>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1">
              <Icon name="DotsHorizontal" className="h-4 w-4" />
              <span className="sr-only">Show hidden breadcrumbs</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {items.slice(1, -1).map((item) => (
                <DropdownMenuItem key={item.id}>
                  <Link to={`/doc/${item.id}`}>{item.title}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </BreadcrumbItem>
        <BreadcrumbSeparator />

        {/* Last item */}
        <BreadcrumbItem>
          <BreadcrumbPage>{items[items.length - 1].title}</BreadcrumbPage>
        </BreadcrumbItem>
      </>
    );
  }

  // Show full path for short paths
  return (
    <>
      {items.map((item, index, array) => (
        <React.Fragment key={item.id}>
          <BreadcrumbItem>
            {index === array.length - 1 ? (
              <BreadcrumbPage>{item.title}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink onClick={() => onNavigate(item.id)} className="cursor-pointer">
                {item.title}
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {index < array.length - 1 && <BreadcrumbSeparator />}
        </React.Fragment>
      ))}
    </>
  );
}

export default function DocumentHeader() {
  const { treeData, selectedKeys, setSelectedKeys } = useDocumentTree();
  const navigate = useNavigate();

  const getBreadcrumbItems = useCallback(() => {
    if (!selectedKeys?.length) return [];

    const selectedId = selectedKeys[0];
    const items: Array<{ id: string; title: string }> = [];
    let currentNode = treeUtils.findNode(treeData, selectedId);

    while (currentNode) {
      items.unshift({
        id: currentNode.key as string,
        title: currentNode.title as string,
      });

      const parentId = treeUtils.findParentKey(treeData, currentNode.key);
      if (!parentId) break;

      currentNode = treeUtils.findNode(treeData, parentId);
    }

    return items;
  }, [selectedKeys, treeData]);

  const breadcrumbItems = getBreadcrumbItems();

  const handleNavigate = (id: string) => {
    navigate(`/doc/${id}`);
    setSelectedKeys([id]);
  };

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
        {breadcrumbItems.length > 0 && <Separator orientation="vertical" className="mr-2 h-4" />}
        <Breadcrumb>
          <BreadcrumbList>
            <DocumentBreadcrumb items={breadcrumbItems} onNavigate={handleNavigate} />
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      {/* right */}
      <div className="mr-2 sm:mr-4">
        <ThemeSwitcher />
      </div>
    </header>
  );
}
