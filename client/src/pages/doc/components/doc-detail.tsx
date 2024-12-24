import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentDocument, useDocumentStore } from "../store";

export default function DocDetail() {
  const { currentDocument } = useCurrentDocument();
  const updateCurrentDocument = useDocumentStore.use.updateCurrentDocument();
  const treeData = useDocumentStore.use.treeData();

  // TODO: seperate this into two components shareDocDetail and DocDetail

  return (
    <div className="flex flex-col gap-4 p-6">
      <Input
        value={currentDocument?.title || ""}
        onChange={(e) => {
          const value = e.target.value;
          if (value.length < 1) return;
          updateCurrentDocument({ title: value });
        }}
        placeholder="Document title"
        className="text-xl font-semibold"
      />
      <Textarea
        value={JSON.stringify(treeData, null, 2) || ""}
        onChange={(e) => updateCurrentDocument({ content: e.target.value })}
        placeholder="Start writing..."
        className="min-h-[400px] resize-none"
      />
    </div>
  );
}
