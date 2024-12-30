interface LinkTabProps {
  onSelect: (imageUrl: string) => Promise<void>;
}

export function LinkTab({ onSelect }: LinkTabProps) {
  return <div>LinkTab</div>;
}
