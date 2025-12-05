import type { Node } from "@tiptap/pm/model";
import { type Editor, NodeViewWrapper } from "@tiptap/react";
import { useCallback, useEffect, useState, useRef } from "react";
import { cn } from "@idea/ui/shadcn/utils";
import { Resizer } from "@idea/ui/base/element-resizer";
import { Skeleton } from "@idea/ui/shadcn/ui/skeleton";
import { preloadImage } from "@/lib/image";
import { ImagePreviewDialog } from "@/components/image-preview-dialog";

interface ImageBlockViewProps {
  editor: Editor;
  getPos: () => number | undefined;
  node: Node;
  updateAttributes: (attrs: Record<string, unknown>) => void;
}

export default function ImageBlockView({ node, updateAttributes, editor }: ImageBlockViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { src, alignment = "center", width, height, aspectRatio = 1 } = node.attrs;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [size, setSize] = useState(() => ({
    width: width ?? "auto",
    height: height ?? "auto",
  }));

  // Handle initial image load and dimensions
  useEffect(() => {
    async function loadImage() {
      setIsLoading(true);
      setError(false);

      try {
        // Only fetch dimensions if we don't have width, height, or aspectRatio
        if (!width || !height || !aspectRatio) {
          const { dimensions, success } = await preloadImage(src);
          if (success) {
            const editorWidth = document.querySelector(".ProseMirror")?.clientWidth ?? 0;
            const newWidth = Math.min(dimensions.width, editorWidth);
            const newHeight = newWidth / (dimensions.width / dimensions.height);

            updateAttributes({
              width: newWidth,
              height: newHeight,
              aspectRatio: dimensions.width / dimensions.height,
            });
          }
        } else {
          // If we already have dimensions, just update loading state
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error loading image:", err);
        setError(true);
        setIsLoading(false);
      }
    }

    void loadImage();
  }, [src, width, height, aspectRatio, updateAttributes]);

  // Update size when dimensions change
  useEffect(() => {
    if (!containerRef.current || !width || !height) return;

    const editorWidth = document.querySelector(".ProseMirror")?.clientWidth ?? 0;
    if (!editorWidth) return;

    const editorWidthWithoutMargin = editorWidth - 40 * 2;

    // Take mx-10 into account
    const newWidth = Math.min(width, editorWidthWithoutMargin);
    const newHeight = newWidth / aspectRatio;

    setSize({
      width: newWidth,
      height: newHeight,
    });
  }, [width, height, aspectRatio]);

  const handleResize = useCallback((newSize: { width: number; height: number }) => {
    setSize(newSize);
  }, []);

  const handleResizeEnd = (finalSize: { width: number; height: number }) => {
    updateAttributes({
      ...finalSize,
      aspectRatio: finalSize.width / finalSize.height,
    });
  };

  const handleImageClick = useCallback(() => {
    // Only open preview if editor is not editable (read-only mode)
    if (!editor.isEditable) {
      setPreviewOpen(true);
    }
  }, [editor]);

  return (
    <>
      <NodeViewWrapper
        ref={containerRef}
        className={cn(
          "flex w-full",
          alignment === "left" && "justify-start",
          alignment === "center" && "justify-center",
          alignment === "right" && "justify-end",
        )}
      >
        <Resizer onResize={handleResize} onResizeEnd={handleResizeEnd} aspectRatio={aspectRatio} lockAspectRatio minWidth={100} maxWidth={1200}>
          <div
            className="relative w-full h-full"
            style={{
              width: size.width,
              height: size.height,
              aspectRatio: aspectRatio,
            }}
          >
            {isLoading && <Skeleton className="absolute inset-0 w-full h-full" style={{ aspectRatio }} />}

            <img
              src={src}
              alt=""
              className={cn(
                "w-full h-full object-contain transition-all duration-300",
                isLoading ? "opacity-0" : "opacity-100",
                !editor.isEditable && "cursor-pointer hover:opacity-90",
              )}
              loading="lazy"
              onLoad={() => setIsLoading(false)}
              onError={() => setError(true)}
              onClick={handleImageClick}
              style={{
                height: "100%",
                aspectRatio,
              }}
            />

            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <span className="text-sm text-muted-foreground">Failed to load image</span>
              </div>
            )}
          </div>
        </Resizer>
      </NodeViewWrapper>

      <ImagePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} src={src} alt="Image preview" />
    </>
  );
}
