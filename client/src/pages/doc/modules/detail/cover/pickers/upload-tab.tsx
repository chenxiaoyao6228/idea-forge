import { UpdateCoverDto } from "shared";

interface UploadTabProps {
  onSelect: (dto: UpdateCoverDto) => Promise<void>;
}

export function UploadTab({ onSelect }: UploadTabProps) {
  return <div>UploadTab</div>;
}
