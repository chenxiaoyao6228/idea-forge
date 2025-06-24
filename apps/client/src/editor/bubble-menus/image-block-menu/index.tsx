import { BubbleMenu } from "@tiptap/react";
import { MenuProps } from "../type";
import Wrapper from "../bubble-menu-wrapper";
import { Editor } from "@tiptap/core";
import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ImageBlockMenu(props: MenuProps) {
  const { editor, containerRef } = props;

  if (editor == null) return null;

  function shouldShow(editor: Editor) {
    return editor.isActive("imageBlock");
  }

  function getCurrentAlignment() {
    return editor.getAttributes("imageBlock").alignment || "center";
  }

  function setAlignment(alignment: "left" | "center" | "right") {
    editor.commands.setImageAlignment(alignment);
  }

  return (
    <BubbleMenu
      editor={editor}
      updateDelay={0}
      tippyOptions={{
        duration: 100,
        moveTransition: "transform 0.2s ease-out",
        appendTo: () => containerRef?.current || document.body,
      }}
      shouldShow={() => shouldShow(editor)}
    >
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
        </div>
      </Wrapper>
    </BubbleMenu>
  );
}
