import type { Node } from "@tiptap/pm/model";
import { type Editor, NodeViewWrapper } from "@tiptap/react";
import { useRef } from "react";

interface ImageBlockViewProps {
  editor: Editor;
  getPos: () => number;
  node: Node;
  updateAttributes: (attrs: Record<string, any>) => void;
}

export const ImageBlockView = (props: ImageBlockViewProps) => {
  const { node } = props;
  const { src } = node.attrs;
  const imgContainerRef = useRef<HTMLDivElement>(null);

  return (
    <NodeViewWrapper>
      <div ref={imgContainerRef} className="relative">
        <img className="block w-full" src={src} alt="" style={{ height: "100%" }} loading="lazy" />
      </div>
    </NodeViewWrapper>
  );
};

export default ImageBlockView;
