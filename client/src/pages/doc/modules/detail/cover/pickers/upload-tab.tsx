interface UploadTabProps {
  onSelect: (imageUrl: string) => Promise<void>;
}

export function UploadTab({ onSelect }: UploadTabProps) {
  return <div>UploadTab</div>;
}
