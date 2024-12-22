import { useDocumentTree, treeUtils } from "../store";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useCallback, useEffect, useState } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { documentApi } from "@/apis/document";

export default function DocumentBreadcrumb() {
  const { treeData, selectedKeys } = useDocumentTree();
  const [firstLoadBreadcrumbItems, setFirstLoadBreadcrumbItems] = useState<Array<{ id: string; title: string }>>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const docId = window.location.pathname.split("/").pop();
    if (docId) {
      documentApi.getDocumentPath(docId).then((path) => {
        setFirstLoadBreadcrumbItems(path);
      });
    }
  }, []);

  const getBreadcrumbItems = useCallback(() => {
    const currentNodeId = selectedKeys[0];
    const items: Array<{ id: string; title: string }> = [];
    let currentNode = treeUtils.findNode(treeData, currentNodeId);

    if (!currentNode) {
      return firstLoadBreadcrumbItems;
    }

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
  }, [selectedKeys, firstLoadBreadcrumbItems, treeData]);

  const breadcrumbItems = getBreadcrumbItems();

  const handleNavigate = (id: string) => {
    const currentNode = treeUtils.findNode(treeData, id);
    // not current node, means breadcrumb is not from store
    if (!currentNode) {
      const index = firstLoadBreadcrumbItems.findIndex((item) => item.id === id);
      if (index > 0) {
        setFirstLoadBreadcrumbItems(firstLoadBreadcrumbItems.slice(0, index + 1));
      }
    }
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
          <React.Fragment key={item.id}>
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
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
