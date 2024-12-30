import { UpdateCoverDto } from "shared";

interface LinkTabProps {
  onSelect: (dto: UpdateCoverDto) => Promise<void>;
}

export function LinkTab({ onSelect }: LinkTabProps) {
  return <div>LinkTab</div>;
}
