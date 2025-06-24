import type React from "react";
import type { Editor } from "@tiptap/react";
import { findParentNode } from "@tiptap/core";
import copy from "copy-to-clipboard";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface CopyCodeButtonProps {
  editor: Editor;
}

const CopyCodeButton: React.FC<CopyCodeButtonProps> = ({ editor }) => {
  const toast = useToast();
  const { t } = useTranslation();
  const handleCopy = () => {
    const { state } = editor;

    const codeBlock = findParentNode((node) => node.type.name === "codeBlock")(state.selection);

    if (codeBlock) {
      copy(codeBlock.node.textContent);
      editor.chain().focus().run();
      toast.toast({
        title: t("Code copied"),
      });
      return;
    }
  };

  return (
    <Button size="sm" variant="ghost" onClick={handleCopy} className="text-sm">
      {t("Copy")}
    </Button>
  );
};

export default CopyCodeButton;
