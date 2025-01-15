import type { Node } from "@tiptap/pm/model";
import { type Editor, NodeViewWrapper } from "@tiptap/react";
import { useCallback, useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Resizer } from "@/components/element-resizer";

interface ImageBlockViewProps {
  editor: Editor;
  getPos: () => number;
  node: Node;
  updateAttributes: (attrs: Record<string, unknown>) => void;
}

export default function ImageBlockView({ node, updateAttributes }: ImageBlockViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { src, alignment = "center", width, height, aspectRatio = 1 } = node.attrs;

  const [size, setSize] = useState(() => ({
    width: width ?? "auto",
    height: height ?? "auto",
  }));

  useEffect(() => {
    if (!containerRef.current) return;
    if (!width || !height) return;

    const editorWidth = document.querySelector(".ProseMirror")?.clientWidth ?? 0;

    if (!editorWidth) return;

    const newWidth = Math.min(width, editorWidth);
    const newHeight = newWidth / aspectRatio;

    setSize({
      width: newWidth,
      height: newHeight,
    });
  }, [width, height, aspectRatio, containerRef]);

  const handleResize = useCallback((newSize: { width: number; height: number }) => {
    setSize(newSize);
  }, []);

  const handleResizeEnd = (finalSize: { width: number; height: number }) => {
    updateAttributes({
      ...finalSize,
      aspectRatio: finalSize.width / finalSize.height,
    });
  };

  return (
    <NodeViewWrapper
      ref={containerRef}
      className={cn("flex w-full", alignment === "left" && "justify-start", alignment === "center" && "justify-center", alignment === "right" && "justify-end")}
    >
      <Resizer onResize={handleResize} onResizeEnd={handleResizeEnd} aspectRatio={aspectRatio} lockAspectRatio minWidth={100} maxWidth={1200}>
        <div className="w-full h-full" style={{ width: size.width, height: size.height }}>
          <img src={src} alt="" className="w-full h-full object-contain transition-opacity duration-300" loading="lazy" style={{ height: "100%" }} />
        </div>
      </Resizer>
    </NodeViewWrapper>
  );
}
