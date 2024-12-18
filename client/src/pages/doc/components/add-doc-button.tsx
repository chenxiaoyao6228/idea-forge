import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useDocumentTree } from "../store";

interface AddDocButtonProps {
  parentId: string | null;
}

export function AddDocButton({ parentId }: AddDocButtonProps) {
  const { createDocument } = useDocumentTree();
  const [isCreating, setIsCreating] = useState(false);

  const handleClick = async () => {
    if (isCreating) return;

    setIsCreating(true);
    try {
      await createDocument(parentId, "Untitled");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Button variant="ghost" size="icon" className="h-4 w-4 p-0 cursor-pointer" onClick={handleClick} disabled={isCreating}>
      <PlusIcon className="h-4 w-4" />
    </Button>
  );
}
