import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "react-use";
import { useEffect, useState } from "react";
import { useCurrentDocument, useDocumentTree } from "../store";
export default function DocDetail() {
  const { updateCurrentDocument } = useDocumentTree();
  const { currentDocument } = useCurrentDocument();

  const [localContent, setLocalContent] = useState(currentDocument?.content || "");
  const [localTitle, setLocalTitle] = useState(currentDocument?.title || "");

  useEffect(() => {
    setLocalContent(currentDocument?.content || "");
    setLocalTitle(currentDocument?.title || "");
  }, [currentDocument?.key]);

  const [, cancel] = useDebounce(() => updateCurrentDocument({ content: localContent }), 300, [localContent]);
  const [, cancelTitle] = useDebounce(() => updateCurrentDocument({ title: localTitle }), 300, [localTitle]);

  return (
    <div className="flex flex-col gap-4 p-6">
      <Input
        value={localTitle}
        onChange={(e) => {
          const value = e.target.value;
          if (value.length < 1) return;
          setLocalTitle(value);
        }}
        placeholder="Document title"
        className="text-xl font-semibold"
      />
      <Textarea value={localContent} onChange={(e) => setLocalContent(e.target.value)} placeholder="Start writing..." className="min-h-[400px] resize-none" />
    </div>
  );
}
