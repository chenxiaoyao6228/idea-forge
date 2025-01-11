import { Skeleton } from "@/components/ui/skeleton";
import { useDocumentStore } from "@/pages/doc/stores/store";
import { CoverPicker } from "./cover-picker";
import { useState, useRef, useEffect } from "react";
import { useCoverImageStore } from "./coverImageStore";
import { UpdateCoverDto } from "shared";

interface CoverProps {
  cover?: {
    url?: string;
    scrollY?: number;
  };
  preview?: boolean;
}

const CONTAINER_HEIGHT_VH = 30;

export default function Cover({ cover = { url: "", scrollY: 50 }, preview: isPreview = false }: CoverProps) {
  const { isPickerOpen, setIsPickerOpen } = useCoverImageStore();
  const [isRepositioning, setIsRepositioning] = useState(false);
  const currentDocument = useDocumentStore.use.currentDocument();
  const isCurrentDocLoading = useDocumentStore.use.isCurrentDocLoading();
  const updateCover = useDocumentStore.use.updateCover();
  const removeCover = useDocumentStore.use.removeCover();
  const [imagePosition, setImagePosition] = useState(cover.scrollY || 50);
  const [startY, setStartY] = useState(0);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleImageSelect = async (dto: UpdateCoverDto) => {
    if (!currentDocument) return;
    await updateCover(currentDocument.id, dto);
  };

  const url = cover.url;

  const handleRemoveCover = async () => {
    if (!currentDocument) return;
    await removeCover(currentDocument.id);
  };

  const handleChangeCover = () => {
    setIsPickerOpen(true);
  };

  const handleStartRepositioning = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsRepositioning(true);
  };

  const handleSavePosition = async () => {
    if (!currentDocument) return;
    await updateCover(currentDocument.id, {
      scrollY: imagePosition,
    });
    setIsRepositioning(false);
  };

  const handleCancelRepositioning = () => {
    if (!currentDocument) return;
    setIsRepositioning(false);
    setImagePosition(scrollY);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (isRepositioning) {
      setStartY(e.clientY);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (isRepositioning && e.buttons === 1) {
      const containerHeight = window.innerHeight * (CONTAINER_HEIGHT_VH / 100);

      const deltaY = e.clientY - startY;

      const percentageDelta = (deltaY / containerHeight) * -100;

      const newPosition = Math.max(0, Math.min(100, imagePosition + percentageDelta));

      setImagePosition(newPosition);
      setStartY(e.clientY);
    }
  };

  useEffect(() => {
    if (cover.url) {
      setImagePosition(scrollY);
    }
  }, [cover.url]);

  useEffect(() => {
    const handlePointerUp = (e: PointerEvent) => {
      e.stopPropagation();
      setStartY(0);
    };

    if (isRepositioning) {
      window.addEventListener("pointerup", handlePointerUp);
    }

    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isRepositioning]);

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      className={`sticky z-1000 left-0 w-full h-[30vh] user-select-none flex-shrink-0 group ${isRepositioning ? "cursor-move" : "cursor-default"}`}
    >
      {isCurrentDocLoading && <Cover.Skeleton />}
      {/* image */}
      <div className="cover-image-container relative inset-0 will-change-transform h-full overflow-hidden">
        <img
          ref={imageRef}
          src={url}
          alt="cover"
          className="absolute left-0 top-0 w-full h-full object-cover transition-transform duration-200 ease-out"
          style={{
            userSelect: isRepositioning ? "none" : "auto",
            objectPosition: `center ${imagePosition}%`,
            imageRendering: "crisp-edges",
            imageResolution: "300dpi",
          }}
          draggable={false}
        />
      </div>

      {/* Only show buttons and positioning tip if not in preview mode */}
      {!isPreview && (
        <>
          {/* buttons group */}
          <div className="absolute left-0 right-0 bottom-0 z-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="box-border h-10 flex justify-end items-center mx-24">
              <div className="btn-group flex">
                {isRepositioning ? (
                  <>
                    <button
                      className="cursor-pointer text-xs px-3 py-1 text-white rounded-l-sm bg-gray-300 bg-opacity-30 hover:bg-gray-400 hover:bg-opacity-40 transition-colors"
                      onClick={handleSavePosition}
                    >
                      Save position
                    </button>
                    <button
                      className="cursor-pointer text-xs px-3 py-1 text-white rounded-r-sm bg-gray-300 bg-opacity-30 hover:bg-gray-400 hover:bg-opacity-40 transition-colors border-l border-white border-opacity-20"
                      onClick={handleCancelRepositioning}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="cursor-pointer text-xs px-3 py-1 text-white rounded-l-sm bg-gray-300 bg-opacity-30 hover:bg-gray-400 hover:bg-opacity-40 transition-colors"
                      onClick={handleChangeCover}
                    >
                      Change cover
                    </button>
                    <button
                      className="cursor-pointer text-xs px-3 py-1 text-white  bg-gray-300 bg-opacity-30 hover:bg-gray-400 hover:bg-opacity-40 transition-colors border-l border-white border-opacity-20"
                      onClick={handleStartRepositioning}
                    >
                      Reposition
                    </button>
                    <button
                      className="cursor-pointer text-xs px-3 py-1 text-white rounded-r-sm bg-gray-300 bg-opacity-30 hover:bg-gray-400 hover:bg-opacity-40 transition-colors border-l border-white border-opacity-20"
                      onClick={handleRemoveCover}
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* positioning handler tip */}
          {isRepositioning && (
            <div className="tip absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
              <div className="text-xs px-3 py-1 text-white rounded-r-sm bg-gray-300 bg-opacity-30 border-l border-white border-opacity-20">
                Drag image to reposition
              </div>
            </div>
          )}

          <CoverPicker isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} onSelect={handleImageSelect} onRemove={handleRemoveCover} />
        </>
      )}
    </div>
  );
}

Cover.Skeleton = function CoverSkeleton() {
  return <Skeleton className="w-full h-full" />;
};
