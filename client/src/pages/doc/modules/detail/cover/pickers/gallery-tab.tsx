interface GalleryTabProps {
  onSelect: (imageUrl: string) => Promise<void>;
}

export function GalleryTab({ onSelect }: GalleryTabProps) {
  return <div>GalleryTab</div>;
}
