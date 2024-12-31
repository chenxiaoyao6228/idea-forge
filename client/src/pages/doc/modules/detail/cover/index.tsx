import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentDocument, useDocumentStore } from "@/pages/doc/store";
import { CoverPicker } from "./cover-picker";
import { useState, useRef, useEffect } from "react";
import { useCoverImageStore } from "./coverImageStore";
import { UpdateCoverDto } from "shared";

interface CoverProps {
  cover: {
    url: string;
    scrollY: number;
  };
}

export default function Cover({ cover }: CoverProps) {
  const { isPickerOpen, setIsPickerOpen } = useCoverImageStore();
  const [isRepositioning, setIsRepositioning] = useState(false);
  const { currentDocument } = useCurrentDocument();
  const updateCover = useDocumentStore.use.updateCover();
  const removeCover = useDocumentStore.use.removeCover();
  const [imagePosition, setImagePosition] = useState(cover.scrollY || 0);
  const [startY, setStartY] = useState(0);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleImageSelect = async (dto: UpdateCoverDto) => {
    await updateCover(currentDocument!.key, dto);
  };

  const url = cover.url;

  const handleRemoveCover = async () => {
    await removeCover(currentDocument!.key);
  };

  const handleChangeCover = () => {
    setIsPickerOpen(true);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (isRepositioning) {
      setStartY(e.clientY - imagePosition);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (isRepositioning && e.buttons === 1) {
      const newPosition = e.clientY - startY;
      const maxPosition = imageRef.current ? imageRef.current.offsetHeight - 300 : 0;
      setImagePosition(Math.max(Math.min(newPosition, 0), -maxPosition));
    }
  };

  const handleStartRepositioning = () => {
    setIsRepositioning(true);
  };

  const handleSavePosition = async () => {
    if (currentDocument) {
      await updateCover(currentDocument.key, {
        scrollY: imagePosition,
      });
      setIsRepositioning(false);
    }
  };

  const handleCancelRepositioning = () => {
    setIsRepositioning(false);
    setImagePosition(scrollY || 0);
  };

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
      className={`sticky z-1000 left-0  w-full h-[30vh]  flex-shrink-0 group ${isRepositioning ? "cursor-move" : "cursor-default"}`}
    >
      {/* image */}
      <div className="cover-image-container relative inset-0 will-change-transform h-full overflow-hidden">
        <img
          ref={imageRef}
          src={url}
          alt="cover"
          className="absolute inset-0 w-full h-auto object-cover transition-transform duration-200 ease-out"
          style={{
            userSelect: isRepositioning ? "none" : "auto",
            objectPosition: `center ${imagePosition}px`,
            imageRendering: "crisp-edges",
            imageResolution: "300dpi",
          }}
          draggable={false}
        />
      </div>

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
    </div>
  );
}

Cover.Skeleton = function CoverSkeleton() {
  return <Skeleton className="w-full h-[12vh]" />;
};
