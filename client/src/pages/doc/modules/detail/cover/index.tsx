import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCurrentDocument, useDocumentStore } from "@/pages/doc/store";
import { CoverPicker } from "./cover-picker";
import { useState } from "react";
import { useCoverImageStore } from "./coverImageStore";
import { UpdateCoverDto } from "shared";

export default function Cover({ url, scrollY }: { url: string; scrollY?: number }) {
  const { currentDocument } = useCurrentDocument();
  const { isPickerOpen, setIsPickerOpen } = useCoverImageStore();
  const [isRepositioning, setIsRepositioning] = useState(false);
  const { updateCover } = useDocumentStore();
  if (!currentDocument || !currentDocument?.coverImage) return null;

  const handleImageSelect = async (dto: UpdateCoverDto) => {
    await updateCover(currentDocument.key, dto);
  };

  const handleRemoveCover = async () => {
    // await removeCover(currentDocument.key);
  };

  const handleChangeCover = () => {
    setIsPickerOpen(true);
  };

  const handleStartRepositioning = () => {
    console.log("start repositioning");
  };

  const handleSavePosition = () => {
    console.log("save position");
  };

  const handleCancelRepositioning = () => {
    console.log("cancel repositioning");
  };

  return (
    <div className={cn("relative w-full h-[35vh] group", !url && "h-[12vh]", url && "bg-muted")}>
      {!!url && <img src={url} alt="Cover" className="object-cover w-full h-full" style={{ transform: `translateY(-${scrollY}px)` }} />}

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
      <CoverPicker isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} onSelect={handleImageSelect} onRemove={handleRemoveCover} />
    </div>
  );
}

Cover.Skeleton = function CoverSkeleton() {
  return <Skeleton className="w-full h-[12vh]" />;
};
