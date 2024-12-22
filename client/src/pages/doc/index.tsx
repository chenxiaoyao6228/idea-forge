import { useDocumentTree } from "./store";
import DocsLayout from "./layout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useThrottle } from "react-use";

export default function Doc() {
  const { currentDocument, updateCurrentDocument } = useDocumentTree();

  const updateCurrentDocTitle = (title: string) => updateCurrentDocument({ title });

  const handleUpdateCurrentDocContentThrottled = useThrottle(updateCurrentDocument, 500);

  return (
    <DocsLayout>
      <div className="flex flex-col gap-4 p-6">
        <Input
          value={currentDocument?.title || ""}
          onChange={(e) => updateCurrentDocTitle(e.target.value)}
          placeholder="Document title"
          className="text-xl font-semibold"
        />
        <Textarea
          value={currentDocument?.content || ""}
          onChange={(e) => handleUpdateCurrentDocContentThrottled({ content: e.target.value })}
          placeholder="Start writing..."
          className="min-h-[400px] resize-none"
        />
      </div>
    </DocsLayout>
  );
}
