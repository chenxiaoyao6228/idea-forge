import { useNavigate } from "react-router-dom";
import { Tree, TreeDataNode } from "@/components/ui/tree";
import { useTranslation } from "react-i18next";

import { SidebarGroup, SidebarGroupLabel, SidebarMenu } from "@/components/ui/sidebar";
import { useSharedDocumentStore } from "../../stores/shared-store";
import { useEffect } from "react";
import { useParams } from "react-router-dom";

export function OthersDocs() {
  const { t } = useTranslation();
  const { docId: curDocId } = useParams();
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
  useEffect(() => {
    if (curDocId) {
      setSelectedKeys([curDocId]);
    }
  }, [curDocId]);

  if (!sharedTreeData.length) return null;

  return (
    <SidebarGroup>
      <div className="flex items-center justify-between group/label">
        <SidebarGroupLabel>{t("Others Docs")}</SidebarGroupLabel>
      </div>
      <SidebarMenu>
        <Tree treeData={sharedTreeData} onSelect={handleSelect} expandedKeys={expandedKeys} onExpand={(keys) => setExpandedKeys(keys)} />
      </SidebarMenu>
    </SidebarGroup>
  );
}
