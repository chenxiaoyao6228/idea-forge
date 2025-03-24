import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { DropdownMenuTrigger, DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Tree, TreeDataNode, TreeProps } from "@/components/ui/tree";
import { MoreHorizontalIcon } from "lucide-react";
import { useDocumentStore } from "../../stores/doc-store";
import { AddDocButton } from "./add-doc-button";
import { logger } from "@/lib/logger";
import { treeUtils } from "../../util";
import { useTranslation } from "react-i18next";
import { documentApi } from "@/apis/document";
import { useToast } from "@/hooks/use-toast";

export function MyDocs() {
  const navigate = useNavigate();
  const { docId: curDocId } = useParams();
  const treeData = useDocumentStore.use.treeData();
  const expandedKeys = useDocumentStore.use.expandedKeys();
  const loadChildren = useDocumentStore.use.loadChildren();
  const loadNestedTree = useDocumentStore.use.loadNestedTree();
  const setExpandedKeys = useDocumentStore.use.setExpandedKeys();
  const moveDocuments = useDocumentStore.use.moveDocuments();
  const deleteDocument = useDocumentStore.use.deleteDocument();
  const updateDocument = useDocumentStore.use.updateDocument();
  const duplicateDocument = useDocumentStore.use.duplicateDocument();
  const { t } = useTranslation();
  const { toast } = useToast();
  useEffect(() => {
    loadNestedTree(curDocId || null);
  }, []);

  const handleSelect = (keys: string[], { node }: { node: TreeDataNode }) => {
    navigate(`/doc/${node.key}`);
  };

  const handleRenameComplete = (key: string, newTitle: string) => {
    updateDocument(key, { title: newTitle });
  };

  const handleDragEnter: TreeProps["onDragEnter"] = (info) => {
    logger.info("onDragEnter", info);
  };

  const handleDrop: TreeProps["onDrop"] = async (info) => {
    const { node: dropNode, dragNode, dropPosition } = info;
    const dragKey = dragNode.key;
    const dragParentId = treeUtils.findParentKey(treeData, dragKey);
    const dropKey = dropNode.key;

    // not allow drop to self
    if (dragKey === dropKey) return;

    // not allow to drop to the same parent
    // if (dragParentId === dropKey) return;

    try {
      await moveDocuments({
        id: dragKey,
        targetId: dropKey,
        dropPosition: !info.dropToGap ? 0 : dropPosition,
      });
    } catch (error) {
      console.error("Failed to move document:", error);
      // TODO: add error toast
    }
  };

  const handleDeleteDoc = async (id: string) => {
    const parentKey = await deleteDocument(id);
    if (parentKey) {
      navigate(`/doc/${parentKey}`);
    }
  };

  const handleDuplicateDoc = async (id: string) => {
    try {
      const newDoc = await duplicateDocument(id);
      if (newDoc) {
        navigate(`/doc/${newDoc.id}`);
      }
    } catch (error: any) {
      console.error("Failed to duplicate document:", error);
      if (error.message) {
        toast({
          description: error.message,
        });
      }
    }
  };

  return (
    <SidebarGroup>
      <div className="flex items-center justify-between group/label">
        <SidebarGroupLabel>{t("My Docs")}</SidebarGroupLabel>
        <div className="flex items-center gap-1 invisible group-hover/label:visible">
          <AddDocButton parentId={null} />
        </div>
      </div>
      <SidebarMenu>
        <Tree
          treeData={treeData}
          draggable
          blockNode
          onDragEnter={handleDragEnter}
          onDrop={handleDrop}
          expandedKeys={expandedKeys}
          selectedKeys={curDocId ? [curDocId] : []}
          showIcon={true}
          onExpand={(keys) => setExpandedKeys(keys)}
          onRename={handleRenameComplete}
          fieldNames={{
            key: "id",
          }}
          onSelect={handleSelect}
          loadData={async (node) => {
            if (!node.isLeaf) {
              await loadChildren(node.key);
            }
          }}
          actionsOnHover
          renderActions={({ node, onDropdownOpenChange, onStartRename }) => (
            <div className="flex items-center">
              <DropdownMenu onOpenChange={onDropdownOpenChange}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-4 w-4 p-0 mr-1 cursor-pointer hover:bg-accent/50 dark:hover:bg-accent/25">
                    <MoreHorizontalIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={onStartRename}>{t("Rename")}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicateDoc(node.key)}>{t("Duplicate")}</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteDoc(node.key)}>
                    {t("Delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <AddDocButton parentId={node.key} />
            </div>
          )}
        />
      </SidebarMenu>
    </SidebarGroup>
  );
}
