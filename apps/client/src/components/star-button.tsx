import { Button } from '@idea/ui/shadcn/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@idea/ui/shadcn/ui/tooltip';
import { Star } from "lucide-react";
import { useIsStarred, useToggleStar } from "@/stores/star-store";
import { useTranslation } from "react-i18next";
import { cn } from '@idea/ui/shadcn/utils';

interface StarButtonProps {
  documentId: string;
  size?: "sm" | "default" | "lg" | "icon";
  className?: string;
  showTooltip?: boolean;
  disabled?: boolean;
}

export function StarButton({ documentId, size = "default", className, showTooltip = true, disabled = false }: StarButtonProps) {
  const { t } = useTranslation();
  const toggleStar = useToggleStar(documentId);
  const isStarred = useIsStarred(documentId);

  const handleToggle = async () => {
    await toggleStar(documentId);
  };

  const button = (
    <Button
      variant="ghost"
      size={size === "sm" ? "sm" : size === "lg" ? "default" : "icon"}
      onClick={handleToggle}
      disabled={disabled}
      className={cn(isStarred && "text-yellow-500 hover:text-yellow-600", className)}
    >
      <Star className={cn("h-4 w-4", isStarred && "fill-yellow-500")} />
    </Button>
  );

  if (showTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>{isStarred ? t("Remove from favorites") : t("Add to favorites")}</TooltipContent>
      </Tooltip>
    );
  }

  return button;
}
