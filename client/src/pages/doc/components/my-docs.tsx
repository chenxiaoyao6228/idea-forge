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

  const handleSelect = (keys: string[], { node }: { node: TreeDataNode }) => {
    // TODO: handle multiple selection
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
    const dropKey = dropNode.key;

    // 不允许拖拽到自身
    if (dragKey === dropKey) {
      return;
    }

    try {
      await moveDocuments({
        id: dragKey,
        targetId: dropKey,
        dropPosition: !info.dropToGap ? 0 : dropPosition,
      });
    } catch (error) {
      console.error("Failed to move document:", error);
      // TODO: 添加错误提示
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
                  <Button variant="ghost" size="icon" className="h-4 w-4 p-0 mr-1 cursor-pointer">
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
