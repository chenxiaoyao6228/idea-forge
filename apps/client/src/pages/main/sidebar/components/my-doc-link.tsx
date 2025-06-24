import { useParams } from "react-router-dom";
import { useEffect } from "react";
import useDocumentStore from "@/stores/document";
import useUIStore from "@/stores/ui";
import { DraggableDocumentContainer } from "./draggable-document-container";

export function MyDocsLink() {
  const { getMyDocsRootDocuments, fetchMyDocsChildren } = useDocumentStore();

  const rootDocuments = getMyDocsRootDocuments();

  useEffect(() => {
    fetchMyDocsChildren(null);
  }, [fetchMyDocsChildren]);

  return (
    <div>
      {rootDocuments.map((node, index) => (
        <DraggableDocumentContainer key={node.id} node={node} parentId={null} subspaceId={null} depth={0} index={index} />
      ))}
    </div>
  );
}
