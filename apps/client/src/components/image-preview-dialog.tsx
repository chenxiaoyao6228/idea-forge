import { useCallback, useState } from "react";
import { Dialog, DialogContent, DialogPortal, DialogOverlay } from "@idea/ui/shadcn/ui/dialog";
import { Button } from "@idea/ui/shadcn/ui/button";
import { Download, ZoomIn, ZoomOut, X, RotateCw } from "lucide-react";
import { cn } from "@idea/ui/shadcn/utils";

interface ImagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  alt?: string;
}

export function ImagePreviewDialog({ open, onOpenChange, src, alt }: ImagePreviewDialogProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = alt || "image";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download image:", error);
    }
  }, [src, alt]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    // Reset zoom and rotation when closing
    setTimeout(() => {
      setZoom(1);
      setRotation(0);
    }, 200);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/90" onClick={handleClose} />
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Control buttons */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <Button variant="secondary" size="icon" onClick={handleZoomOut} disabled={zoom <= 0.5} title="Zoom out">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" onClick={handleZoomIn} disabled={zoom >= 3} title="Zoom in">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" onClick={handleRotate} title="Rotate">
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" onClick={handleDownload} title="Download">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" onClick={handleClose} title="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Image container */}
          <div className="relative w-full h-full flex items-center justify-center p-8 cursor-pointer" onClick={handleClose}>
            <div
              className="relative transition-transform duration-200 ease-out"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <img src={src} alt={alt || "Preview"} className="max-w-full max-h-[90vh] object-contain" draggable={false} />
            </div>
          </div>

          {/* Zoom indicator */}
          {zoom !== 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded text-sm">
              {Math.round(zoom * 100)}%
            </div>
          )}
        </div>
      </DialogPortal>
    </Dialog>
  );
}
