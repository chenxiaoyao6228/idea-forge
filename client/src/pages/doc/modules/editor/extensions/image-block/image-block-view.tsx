import { Spinner } from "@/components/ui/spinner";
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
  const { src, isUploading } = node.attrs;
  const imgContainerRef = useRef<HTMLDivElement>(null);

  return (
    <NodeViewWrapper>
      <div ref={imgContainerRef} className="relative">
        <img className={`block w-full ${isUploading ? "opacity-50" : ""}`} src={src} alt="" style={{ height: "100%" }} loading="lazy" />
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-white/30">
            <div className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-white/80">
              <Spinner className="w-4 h-4" />
              <span className="text-sm text-gray-600">Uploading...</span>
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export default ImageBlockView;
