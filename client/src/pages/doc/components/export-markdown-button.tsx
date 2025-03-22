import { fileSave } from "@/lib/filesystem";

import { Button } from "../../../components/ui/button";
import { FileDown } from "lucide-react";
import { useCurrentDocumentState, useEditorStore } from "../stores/editor-store";
import { useDocumentStore } from "../stores/doc-store";
import { useTranslation } from "react-i18next";
export default function ExportMarkdownButton() {
  const { t } = useTranslation();
  const editor = useEditorStore((state) => state.editor);
  const currentDocument = useDocumentStore.use.currentDocument();

  if (!editor) return null;

  const handleExportMarkdown = async () => {
    const markdown = editor.storage.markdown.get();
    // Remove escape characters from the markdown content
    const cleanedMarkdown = markdown.replace(/\\([>:#])/g, "$1");
    const blob = new Blob([cleanedMarkdown], { type: "text/markdown" });

    try {
      await fileSave(blob, {
        name: `${currentDocument?.title}`,
        extension: "md",
        description: "Markdown File",
      });
      console.log("Markdown exported successfully");
    } catch (error) {
      console.error("Error exporting markdown:", error);
    }
  };

  return (
    <Button variant="ghost" className="w-full justify-start p-2 h-8" onClick={handleExportMarkdown}>
      <FileDown className="h-4 w-4" />
      {t("Export Markdown")}
    </Button>
  );
}
