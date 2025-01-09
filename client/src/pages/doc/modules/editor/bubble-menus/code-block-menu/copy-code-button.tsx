import type React from "react";
import type { Editor } from "@tiptap/react";
import { findParentNode } from "@tiptap/core";
import copy from "copy-to-clipboard";
import { useToast } from "@/hooks/use-toast";

interface CopyCodeButtonProps {
  editor: Editor;
}

const CopyCodeButton: React.FC<CopyCodeButtonProps> = ({ editor }) => {
  const toast = useToast();
  const handleCopy = () => {
    const { state } = editor;

    const codeBlock = findParentNode((node) => node.type.name === "codeBlock")(state.selection);

    if (codeBlock) {
      copy(codeBlock.node.textContent);
      editor.chain().focus().run();
      toast.toast({
        title: "Code copied",
      });
      return;
    }
  };

  return (
    <button onClick={handleCopy} className="text-sm">
      Copy
    </button>
  );
};

export default CopyCodeButton;
