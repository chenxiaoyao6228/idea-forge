import { useDocumentTree } from "./store";
import DocsLayout from "./layout";

export default function Doc() {
  const { selectedKeys } = useDocumentTree();
  const docId = selectedKeys[0];
  return (
    <DocsLayout>
      <div className="p-6"> {docId}</div>
    </DocsLayout>
  );
}
