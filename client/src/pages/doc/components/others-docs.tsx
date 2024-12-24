import { useNavigate } from "react-router-dom";
import { Tree, TreeDataNode } from "@/components/ui/tree";

import { SidebarGroup, SidebarGroupLabel, SidebarMenu } from "@/components/ui/sidebar";
import { useSharedDocumentStore } from "../shared-store";
import { useEffect } from "react";

export function OthersDocs() {
  const sharedTreeData = useSharedDocumentStore.use.sharedTreeData();
  const expandedKeys = useSharedDocumentStore.use.expandedKeys();
  const setSelectedKeys = useSharedDocumentStore.use.setSelectedKeys();
  const setExpandedKeys = useSharedDocumentStore.use.setExpandedKeys();
  const loadSharedDocuments = useSharedDocumentStore.use.loadSharedDocuments();

  const navigate = useNavigate();

  const handleSelect = (keys: string[], { node }: { node: TreeDataNode }) => {
    // author node is not a doc node
    if (node.isLeaf) {
      navigate(`/doc/${node.key}`);
    }
  };

  useEffect(() => {
    loadSharedDocuments();
  }, []);

  // Get document ID from URL
  const docId = window.location.pathname.split("/").pop();
  useEffect(() => {
    if (docId) {
      setSelectedKeys([docId]);
    }
  }, [docId]);

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
