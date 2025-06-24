import { UpdateCoverDto } from "@idea/contracts";
import { PRESET_CATEGORIES } from "../../constants";

interface GalleryTabProps {
  onSelect: (dto: UpdateCoverDto) => Promise<void>;
  onClose: () => void;
}

export function GalleryTab({ onSelect, onClose }: GalleryTabProps) {
  return (
    <div className="space-y-6">
      {PRESET_CATEGORIES.map((category) => (
        <div key={category.name}>
          <h3 className="text-sm font-medium mb-3">{category.name}</h3>
          <div className="grid grid-cols-4 gap-4">
            {category.items.map((item, index) => (
              <button
                key={item.url}
                className="relative aspect-video rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => onSelect({ url: item.url, isPreset: true })}
              >
                <img src={item.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
