import { Button } from "@idea/ui/shadcn/ui/button";
import { Send } from "lucide-react";
import { usePublishDocument } from "@/stores/subscription-store";
import { useDocumentById } from "@/stores/document-store";
import { useDocumentPermissions } from "@/hooks/permissions";
import { cn } from "@idea/ui/shadcn/utils";
import { TooltipWrapper } from "../tooltip-wrapper";
import { useTranslation } from "react-i18next";

/*
 * FIXME: this is a temporary solution, change to auto publish after we have document version control
 */
interface PublishButtonProps {
  documentId: string;
  className?: string;
  onPublished?: () => void;
}

/**
 * Publish button component for documents
 * Allows document authors to publish updates and notify subscribers
 * Only visible to users with Update or Manage permission
 */
export function PublishButton({ documentId, className, onPublished }: PublishButtonProps) {
  const { t } = useTranslation();
  const publishDocument = usePublishDocument();
  const document = useDocumentById(documentId);

  // Check if user has publish permission
  const { canPublishDocument } = useDocumentPermissions(document);

  const handlePublish = async () => {
    await publishDocument.run(documentId);
    onPublished?.();
  };

  // Don't render button if user doesn't have permission
  if (!canPublishDocument) {
    return null;
  }

  return (
    <TooltipWrapper disabled={publishDocument.loading} tooltip={t("Publish")}>
      <Button variant={"ghost"} size={"icon"} className={cn("transition-all", className)} onClick={handlePublish} disabled={publishDocument.loading}>
        <Send className={cn("h-4 w-4", publishDocument.loading && "animate-pulse")} />
      </Button>
    </TooltipWrapper>
  );
}
