import { fileOpen } from "@/lib/filesystem";
import { Button } from "../../../components/ui/button";
import { FileUp } from "lucide-react";
import { useEditorStore } from "../../../stores/editor-store";
import { useTranslation } from "react-i18next";

export default function ImportMarkdownButton() {
  const { t } = useTranslation();
  const editor = useEditorStore((state) => state.editor);
  if (!editor) return null;

  const handleImportMarkdown = async () => {
    try {
      const file = await fileOpen({
        description: "Markdown files",
        extensions: ["md"],
      });

      const content = await file.text();
      editor.storage.markdown.set(content, true);
      console.log("Markdown imported successfully");
    } catch (error) {
      console.error("Error importing markdown:", error);
    }
  };

  return (
    <Button variant="ghost" className="w-full justify-start p-2 h-8" onClick={handleImportMarkdown}>
      <FileUp className="h-4 w-4" />
      {t("Import Markdown")}
    </Button>
  );
}
