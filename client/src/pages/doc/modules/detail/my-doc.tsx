import { useCurrentDocument } from "../../stores/store";
import { useDocumentStore } from "../../stores/store";
import { Textarea } from "@/components/ui/textarea";
import { Toolbar } from "./toolbar";
import Cover from "./cover";
import TiptapEditor from "../editor";

export default function DocDetail() {
  const { currentDocument } = useCurrentDocument();

  if (!currentDocument) return null;

  return (
    <div className="pb-40">
      {currentDocument?.coverImage && <Cover cover={currentDocument.coverImage} />}
      <div className="md:max-w-3xl lg:max-w-4xl mx-auto ">
        <Toolbar doc={currentDocument} preview={false} />
        <TiptapEditor id={currentDocument.id} />
      </div>
    </div>
  );
}
