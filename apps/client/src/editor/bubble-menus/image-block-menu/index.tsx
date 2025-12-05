import { CustomBubbleMenu } from "../custom-bubble-menu";
import { MenuProps } from "../type";
import Wrapper from "../bubble-menu-wrapper";
import { Editor } from "@tiptap/core";
import { AlignCenter, AlignLeft, AlignRight, Maximize2 } from "lucide-react";
import { Button } from "@idea/ui/shadcn/ui/button";
import { ImagePreviewDialog } from "@/components/image-preview-dialog";
import { useState } from "react";

export default function ImageBlockMenu(props: MenuProps) {
  const { editor, containerRef } = props;
  const [previewOpen, setPreviewOpen] = useState(false);

  if (editor == null) return null;

  function shouldShow({ editor }: { editor: Editor }) {
    return editor.isActive("imageBlock");
  }

  function getCurrentAlignment() {
    return editor.getAttributes("imageBlock").alignment || "center";
  }

  function setAlignment(alignment: "left" | "center" | "right") {
    editor.commands.setImageAlignment(alignment);
  }

  function handlePreview() {
    setPreviewOpen(true);
  }

  const imageAttrs = editor.getAttributes("imageBlock");
  const imageSrc = imageAttrs.src || "";

  return (
    <>
      <CustomBubbleMenu editor={editor} updateDelay={0} shouldShow={shouldShow} appendTo={() => containerRef?.current || document.body}>
        <Wrapper>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className={`p-2 ${getCurrentAlignment() === "left" ? "bg-muted" : ""}`} onClick={() => setAlignment("left")}>
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className={`p-2 ${getCurrentAlignment() === "center" ? "bg-muted" : ""}`} onClick={() => setAlignment("center")}>
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className={`p-2 ${getCurrentAlignment() === "right" ? "bg-muted" : ""}`} onClick={() => setAlignment("right")}>
              <AlignRight className="h-4 w-4" />
            </Button>
            <div className="w-px h-4 bg-border mx-1" />
            <Button variant="ghost" size="sm" className="p-2" onClick={handlePreview} title="Preview">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </Wrapper>
      </CustomBubbleMenu>

      <ImagePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} src={imageSrc} alt="Image preview" />
    </>
  );
}
