import { useCurrentDocument } from "../../store";
import { useDocumentStore } from "../../store";
import { Textarea } from "@/components/ui/textarea";
import { Toolbar } from "./toolbar";
import Cover from "./cover";
import { getDefaultCoverUrl } from "./cover/utils";

export default function DocDetail() {
  const { currentDocument } = useCurrentDocument();
  const updateCurrentDocument = useDocumentStore.use.updateCurrentDocument();
  const treeData = useDocumentStore.use.treeData();

  if (!currentDocument) return null;

  const coverImageUrl = currentDocument?.coverImage?.url || "";

  return (
    <div className="pb-40">
      {<Cover url={coverImageUrl} />}
      <div className="md:max-w-3xl lg:max-w-4xl mx-auto">
        <Toolbar doc={currentDocument} preview={false} />
        <Textarea
          value={JSON.stringify(treeData, null, 2) || ""}
          onChange={(e) => updateCurrentDocument({ content: e.target.value })}
          placeholder="Start writing..."
          className="min-h-[400px] resize-none mt-5"
        />
      </div>
    </div>
  );
}
