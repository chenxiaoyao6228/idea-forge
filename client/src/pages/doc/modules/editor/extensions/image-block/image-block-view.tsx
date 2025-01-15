import type { Node } from "@tiptap/pm/model";
import { type Editor, NodeViewWrapper } from "@tiptap/react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

interface ImageBlockViewProps {
  editor: Editor;
  getPos: () => number;
  node: Node;
  updateAttributes: (attrs: Record<string, any>) => void;
}

export const ImageBlockView = (props: ImageBlockViewProps) => {
  const { node } = props;
  const { src, alignment = "center" } = node.attrs;
  const imgContainerRef = useRef<HTMLDivElement>(null);

  return (
    <NodeViewWrapper>
      <div
        ref={imgContainerRef}
        className={cn(alignment === "left" ? "ml-0" : "ml-auto", alignment === "right" ? "mr-0" : "mr-auto", alignment === "center" && "mx-auto", "bg-muted")}
      >
        <img className="block max-w-full" src={src} alt="" style={{ height: "100%" }} loading="lazy" />
      </div>
    </NodeViewWrapper>
  );
};

export default ImageBlockView;
