import Cover from "./cover";

import { useParams } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Toolbar } from "./toolbar";
import { useSharedDocumentStore } from "../../stores/shared-store";

export default function ShareDoc() {
  const { docId: curDocId } = useParams();

  if (!curDocId) return <div>No document id</div>;

  const currentDocument = useSharedDocumentStore.use.getCurrentSharedDoc()(curDocId);

  if (!currentDocument) return <div>No document</div>;

  return (
    <div className="pb-40">
      {currentDocument?.coverImage && <Cover cover={currentDocument.coverImage} preview={true} />}
      <div className="md:max-w-3xl lg:max-w-4xl mx-auto ">
        <Toolbar doc={currentDocument} preview={true} />
      </div>
    </div>
  );
}
