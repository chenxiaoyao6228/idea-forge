import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { DropdownMenuTrigger, DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Tree, TreeDataNode, TreeProps } from "@/components/ui/tree";
import { MoreHorizontalIcon } from "lucide-react";
import { treeUtils, useDocumentTree } from "../store";
import { AddDocButton } from "./add-doc-button";
import { logger } from "@/lib/logger";

export function MyDocs() {
  const navigate = useNavigate();
  const { treeData, expandedKeys, selectedKeys, loadChildren, setExpandedKeys, setSelectedKeys, moveDocuments, deleteDocument, updateDocument } =
    useDocumentTree();

  useEffect(() => {
    loadChildren(null);
  }, []);

  useEffect(() => {
    // Get document ID from URL
    const docId = window.location.pathname.split("/").pop();
    if (docId) {
      setSelectedKeys([docId]);
    }
  }, [window.location.pathname]);

  const handleSelect = (keys: string[], { node }: { node: TreeDataNode }) => {
    setSelectedKeys([node.key]);
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
    if (dragParentId === dropKey) return;

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

  return (
    <SidebarGroup>
      <div className="flex items-center justify-between group/label">
        <SidebarGroupLabel>Private</SidebarGroupLabel>
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
          selectedKeys={selectedKeys}
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
            <div className="flex gap-1 ">
              <DropdownMenu onOpenChange={onDropdownOpenChange}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-4 w-4 p-0 mr-1 cursor-pointer hover:bg-accent/50 dark:hover:bg-accent/25">
                    <MoreHorizontalIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={(e) => {
                      onStartRename();
                    }}
                  >
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => deleteDocument(node.key)}>
                    Delete
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
