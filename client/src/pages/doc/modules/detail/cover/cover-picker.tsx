import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GalleryTab } from "./pickers/gallery-tab";
import { UploadTab } from "./pickers/upload-tab";
import { LinkTab } from "./pickers/link-tab";
import { useClickAway } from "react-use";
import { UpdateCoverDto } from "shared";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface CoverPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (dto: UpdateCoverDto) => Promise<void>;
  onRemove: () => Promise<void>;
}

export function CoverPicker({ isOpen, onClose, onSelect, onRemove }: CoverPickerProps) {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useState("gallery");
  const ref = useRef(null);

  useClickAway(ref, onClose);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div ref={ref} className="bg-white rounded-lg w-[640px] max-h-[80vh] overflow-hidden">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="flex border-b px-4 justify-between">
            <div className="flex">
              <TabsTrigger value="gallery">{t("Gallery")}</TabsTrigger>
              <TabsTrigger value="upload">{t("Upload")}</TabsTrigger>
              <TabsTrigger value="link">{t("Link")}</TabsTrigger>
            </div>
            <TabsTrigger
              value="remove"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                onRemove();
                onClose();
              }}
            >
              <Trash2 className="h-4 w-4 mr-[-10px] text-red-500" />
            </TabsTrigger>
          </TabsList>

          <div className="p-4 h-[500px] overflow-y-auto">
            <TabsContent value="gallery">
              <GalleryTab onSelect={onSelect} onClose={onClose} />
            </TabsContent>
            <TabsContent value="upload">
              <UploadTab onSelect={onSelect} onClose={onClose} />
            </TabsContent>
            <TabsContent value="link">
              <LinkTab onSelect={onSelect} onClose={onClose} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>,
    document.body,
  );
}
