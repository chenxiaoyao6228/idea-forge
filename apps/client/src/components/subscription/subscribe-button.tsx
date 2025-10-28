import { Button } from "@idea/ui/shadcn/ui/button";
import { Bell, BellOff } from "lucide-react";
import { useIsSubscribedToDocumentOrSubspace, useToggleDocumentSubscription } from "@/stores/subscription-store";
import { useDocumentById } from "@/stores/document-store";
import { cn } from "@idea/ui/shadcn/utils";
import { TooltipWrapper } from "../tooltip-wrapper";
import { useTranslation } from "react-i18next";

interface SubscribeButtonProps {
  documentId: string;
  className?: string;
}

/**
 * Subscribe button component for documents
 * Allows users to subscribe/unsubscribe to document updates
 * Shows subscribed state if user is subscribed to either the document or its parent subspace
 */
export function SubscribeButton({ documentId, className }: SubscribeButtonProps) {
  const { t } = useTranslation();
  const document = useDocumentById(documentId);
  const subspaceId = document?.subspaceId ?? undefined;
  const isSubscribed = useIsSubscribedToDocumentOrSubspace(documentId, subspaceId);
  const toggleSubscription = useToggleDocumentSubscription(documentId, subspaceId);

  // Icon based on subscription status
  const Icon = isSubscribed ? Bell : BellOff;

  return (
    <TooltipWrapper disabled={false} tooltip={isSubscribed ? t("Click to unsubscribe") : t("Click to subscribe")}>
      <Button variant="ghost" size="icon" className={cn("transition-all", className)} onClick={toggleSubscription}>
        <Icon className={cn("h-4 w-4")} />
      </Button>
    </TooltipWrapper>
  );
}
