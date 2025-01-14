import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useDocumentStore } from "../../stores/doc-store";
import { useNavigate } from "react-router-dom";

interface AddDocButtonProps {
  parentId: string | null;
}

export function AddDocButton({ parentId }: AddDocButtonProps) {
  const createDocument = useDocumentStore.use.createDocument();

  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);

  const handleClick = async () => {
    if (isCreating) return;

    setIsCreating(true);
    try {
      const newDocId = await createDocument(parentId, "Untitled");
      navigate(`/doc/${newDocId}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-4 w-4 p-0 cursor-pointer hover:bg-accent/50 dark:hover:bg-accent/25"
      onClick={handleClick}
      disabled={isCreating}
    >
      <PlusIcon className="h-4 w-4" />
    </Button>
  );
}
