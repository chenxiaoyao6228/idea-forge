import { useDocumentTree, treeUtils } from "../store";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Fragment, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";

export default function DocumentBreadcrumb() {
  const { treeData, selectedKeys } = useDocumentTree();
  const navigate = useNavigate();

  const getBreadcrumbItems = useCallback(() => {
    const currentNodeId = selectedKeys[0];
    const items: Array<{ id: string; title: string }> = [];
    let currentNode = treeUtils.findNode(treeData, currentNodeId);

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
  };

  if (breadcrumbItems.length > 3) {
    return (
      <>
        {/* First item */}
        <BreadcrumbItem>
          <BreadcrumbLink onClick={() => handleNavigate(breadcrumbItems[0].id)} className="cursor-pointer">
            {breadcrumbItems[0].title}
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
                  {item.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </BreadcrumbItem>
        <BreadcrumbSeparator />

        {/* Last item */}
        <BreadcrumbItem>
          <BreadcrumbPage>{breadcrumbItems[breadcrumbItems.length - 1].title}</BreadcrumbPage>
        </BreadcrumbItem>
      </>
    );
  }

  // Show full path for short paths
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbItems.map((item, index, array) => (
          <Fragment key={item.id}>
            <BreadcrumbItem>
              {index === array.length - 1 ? (
                <BreadcrumbPage>{item.title}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink onClick={() => handleNavigate(item.id)} className="cursor-pointer">
                  {item.title}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < array.length - 1 && <BreadcrumbSeparator />}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
