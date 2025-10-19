import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@idea/ui/shadcn/ui/breadcrumb';
import { Fragment, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@idea/ui/shadcn/ui/dropdown-menu';
import { Icon } from '@idea/ui/base/icon';
import { Separator } from '@idea/ui/shadcn/ui/separator';
import { NavigationTreeNode } from "@idea/contracts";
import { Emoji } from "emoji-picker-react";

interface BreadcrumbItemData {
  id: string;
  title: string;
  icon?: string;
}

interface PublicDocumentBreadcrumbProps {
  navigationTree: NavigationTreeNode;
  token: string;
  activeDocId: string;
}

/**
 * Find the path from root to a target document in the navigation tree
 */
function findPathToDocument(node: NavigationTreeNode, targetId: string, currentPath: NavigationTreeNode[] = []): NavigationTreeNode[] | null {
  // Add current node to path
  const path = [...currentPath, node];

  // Check if we found the target
  if (node.id === targetId) {
    return path;
  }

  // Search in children
  if (node.children) {
    for (const child of node.children) {
      const result = findPathToDocument(child, targetId, path);
      if (result) {
        return result;
      }
    }
  }

  // Not found in this branch
  return null;
}

export default function PublicDocumentBreadcrumb({ navigationTree, token, activeDocId }: PublicDocumentBreadcrumbProps) {
  const navigate = useNavigate();

  const breadcrumbItems = useMemo(() => {
    const path = findPathToDocument(navigationTree, activeDocId);
    if (!path) return [];

    return path.map((node) => ({
      id: node.id,
      title: node.title,
      icon: node.icon || undefined,
    })) as BreadcrumbItemData[];
  }, [navigationTree, activeDocId]);

  const handleNavigate = (id: string) => {
    navigate(`/share/${token}/doc/${id}`);
  };

  if (!breadcrumbItems.length) return null;

  const renderBreadcrumbItem = (item: BreadcrumbItemData) => {
    return (
      <div className="flex items-center gap-1">
        {item.icon ? <Emoji unified={item.icon} size={20} /> : null}
        <span className="truncate">{item.title}</span>
      </div>
    );
  };

  // Collapse breadcrumbs if path is too long (>3 items)
  if (breadcrumbItems.length > 3) {
    return (
      <>
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {/* First item */}
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => handleNavigate(breadcrumbItems[0].id)} className="cursor-pointer">
                {renderBreadcrumbItem(breadcrumbItems[0])}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />

            {/* Collapsed middle items */}
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1">
                  <Icon name="DotsHorizontal" className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {breadcrumbItems.slice(1, -1).map((item) => (
                    <DropdownMenuItem key={item.id} onClick={() => handleNavigate(item.id)}>
                      {renderBreadcrumbItem(item)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator />

            {/* Last item */}
            <BreadcrumbItem>
              <BreadcrumbPage>{renderBreadcrumbItem(breadcrumbItems[breadcrumbItems.length - 1])}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </>
    );
  }

  // Show full path for short paths (<=3 items)
  return (
    <>
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbItems.map((item, index, array) => (
            <Fragment key={item.id}>
              <BreadcrumbItem>
                {index === array.length - 1 ? (
                  <BreadcrumbPage>{renderBreadcrumbItem(item)}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink onClick={() => handleNavigate(item.id)} className="cursor-pointer">
                    {renderBreadcrumbItem(item)}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {index < array.length - 1 && <BreadcrumbSeparator />}
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </>
  );
}
