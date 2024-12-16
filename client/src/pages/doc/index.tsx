import { useParams } from "react-router-dom";
import DocsLayout from "./layout";

export default function Doc() {
  const { docId } = useParams();

  return (
    <DocsLayout>
      <div className="p-6">Doc</div>
    </DocsLayout>
  );
}
