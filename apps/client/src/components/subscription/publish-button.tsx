import { Button } from "@idea/ui/shadcn/ui/button";
import { Send } from "lucide-react";
import { usePublishDocument } from "@/stores/subscription-store";
import { cn } from "@idea/ui/shadcn/utils";
import { TooltipWrapper } from "../tooltip-wrapper";
import { useTranslation } from "react-i18next";

interface PublishButtonProps {
  documentId: string;
  className?: string;
  onPublished?: () => void;
}

/**
 * Publish button component for documents
 * Allows document authors to publish updates and notify subscriber
 */
export function PublishButton({ documentId, className, onPublished }: PublishButtonProps) {
  const { t } = useTranslation();
  const publishDocument = usePublishDocument();

  const handlePublish = async () => {
    await publishDocument.run(documentId);
    onPublished?.();
  };

  return (
    <TooltipWrapper disabled={publishDocument.loading} tooltip={t("Publish")}>
      <Button variant={"ghost"} size={"icon"} className={cn("transition-all", className)} onClick={handlePublish} disabled={publishDocument.loading}>
        <Send className={cn("h-4 w-4", publishDocument.loading && "animate-pulse")} />
      </Button>
    </TooltipWrapper>
  );
}
