import { useDocumentStore } from "../store";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Fragment, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { treeUtils } from "../util";
import { Separator } from "@/components/ui/separator";
import { Emoji } from "emoji-picker-react";
import { useParams } from "react-router-dom";

interface BreadcrumbItemData {
  id: string;
  title: string;
  icon: string;
}

export default function DocumentBreadcrumb() {
  const { docId: curDocId } = useParams();
  const treeData = useDocumentStore.use.treeData();

  const navigate = useNavigate();

  const getBreadcrumbItems = useCallback(() => {
    const items: Array<BreadcrumbItemData> = [];
    let currentNode = curDocId ? treeUtils.findNode(treeData, curDocId) : null;

    while (currentNode) {
      items.unshift({
        id: currentNode.key as string,
        title: currentNode.title as string,
        icon: currentNode.icon as string,
      });

      const parentId = treeUtils.findParentKey(treeData, currentNode.key);
      if (!parentId) break;

      currentNode = treeUtils.findNode(treeData, parentId);
    }

    return items;
  }, [curDocId, treeData]);

  const breadcrumbItems = getBreadcrumbItems();

  const handleNavigate = (id: string) => {
    navigate(`/doc/${id}`);
  };

  if (!breadcrumbItems.length) return null;

  const renderBreadcrumbItem = (item: BreadcrumbItemData) => {
    return (
      <div className="flex items-center gap-1">
        <Emoji unified={item.icon} size={20} />
        {item.title}
      </div>
    );
  };

  if (breadcrumbItems.length > 3) {
    return (
      <>
        <Separator orientation="vertical" className="mr-2 h-4" />
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
      </>
    );
  }

  // Show full path for short paths
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
