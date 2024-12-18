import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { DropdownMenuTrigger, DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DirectoryTree, TreeProps } from "@/components/ui/tree";
import { PlusIcon, MoreHorizontalIcon } from "lucide-react";
import { useDocumentTree } from "../store";

export function MyDocs() {
  // const { treeData, loadChildren, expandNode, collapseNode, isNodeExpanded, loading } = useDocumentTree();
  // const navigate = useNavigate();
  // const params = useParams();

  // useEffect(() => {
  //   loadChildren(null);
  // }, []);

  // const handleSelect = (docId: string) => {
  //   navigate(`/doc/${docId}`);
  // };

  const treeData: TreeProps["treeData"] = [
    {
      title: "parent 1",
      key: "0-0",
      children: [
        {
          title: "parent 1-0-女哦恶女哦额女i呢哦v你",
          key: "0-0-0",
          //   disabled: true,
          children: [
            {
              title: "leaf-女哦恶女哦额女i呢哦v你",
              key: "0-0-0-0",
              isLeaf: true,
              //   disableCheckbox: true,
            },
            {
              title: "leaf",
              key: "0-0-0-1",
              isLeaf: true,
            },
          ],
        },
        {
          title: "parent 1-1",
          key: "0-0-1",
          children: [{ title: <span style={{ color: "#1677ff" }}>sss</span>, key: "0-0-1-0", isLeaf: true }],
        },
      ],
    },
  ];

  return (
    <SidebarGroup>
      <div className="flex items-center justify-between group/label">
        <SidebarGroupLabel>Private</SidebarGroupLabel>
        <div className="flex items-center gap-1 invisible group-hover/label:visible">{/* <AddDocButton parentId={null} docId={null} /> */}</div>
      </div>
      <SidebarMenu>
        <DirectoryTree
          treeData={treeData}
          actionsOnHover={true}
          renderActions={({ onDropdownOpenChange }) => (
            <div className="flex gap-1">
              <DropdownMenu onOpenChange={onDropdownOpenChange}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-4 w-4 p-0 mr-1">
                    <MoreHorizontalIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Rename</DropdownMenuItem>
                  <DropdownMenuItem>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                <PlusIcon className="h-4 w-4" />
              </Button>
            </div>
          )}
        />
      </SidebarMenu>
    </SidebarGroup>
  );
}
