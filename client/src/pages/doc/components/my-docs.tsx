import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { DropdownMenuTrigger, DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Tree, TreeDataNode } from "@/components/ui/tree";
import { MoreHorizontalIcon } from "lucide-react";
import { useDocumentTree } from "../store";
import { AddDocButton } from "./add-doc-button";

export function MyDocs() {
  const navigate = useNavigate();
  const { treeData, expandedKeys, selectedKeys, loadChildren, setExpandedKeys, setSelectedKeys, deleteDocument } = useDocumentTree();

  useEffect(() => {
    loadChildren(null);
  }, []);

  const handleSelect = (keys: string[], { node }: { node: TreeDataNode }) => {
    // TODO: handle multiple selection
    setSelectedKeys([node.key]);
    navigate(`/doc/${node.key}`);
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
          expandedKeys={expandedKeys}
          selectedKeys={selectedKeys}
          onExpand={(keys) => setExpandedKeys(keys)}
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
          renderActions={({ node, onDropdownOpenChange }) => (
            <div className="flex gap-1 ">
              <DropdownMenu onOpenChange={onDropdownOpenChange}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-4 w-4 p-0 mr-1 cursor-pointer">
                    <MoreHorizontalIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Rename</DropdownMenuItem>
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
