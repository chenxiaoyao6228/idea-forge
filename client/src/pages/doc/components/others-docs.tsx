import { useNavigate } from "react-router-dom";
import { Tree, TreeDataNode } from "@/components/ui/tree";

import { SidebarGroup, SidebarGroupLabel, SidebarMenu } from "@/components/ui/sidebar";
import { useSharedDocumentStore } from "../shared-store";
import { useEffect } from "react";

export function OthersDocs() {
  const sharedTreeData = useSharedDocumentStore.use.sharedTreeData();
  const expandedKeys = useSharedDocumentStore.use.expandedKeys();
  const setExpandedKeys = useSharedDocumentStore.use.setExpandedKeys();
  const loadSharedDocuments = useSharedDocumentStore.use.loadSharedDocuments();

  const navigate = useNavigate();

  const handleSelect = (keys: string[], { node }: { node: TreeDataNode }) => {
    navigate(`/doc/${node.key}`);
  };

  useEffect(() => {
    loadSharedDocuments();
  }, []);

  if (!sharedTreeData.length) return null;

  return (
    <SidebarGroup>
      <div className="flex items-center justify-between group/label">
        <SidebarGroupLabel>Others Docs</SidebarGroupLabel>
      </div>
      <SidebarMenu>
        <Tree treeData={sharedTreeData} onSelect={handleSelect} expandedKeys={expandedKeys} onExpand={(keys) => setExpandedKeys(keys)} />
      </SidebarMenu>
    </SidebarGroup>
  );
}
