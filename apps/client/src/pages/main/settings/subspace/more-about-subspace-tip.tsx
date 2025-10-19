import { Button } from '@idea/ui/shadcn/ui/button';
import { cn } from '@idea/ui/shadcn/utils';
import { HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface MoreAboutSubspaceTipProps {
  className?: string;
}

export const MoreAboutSubspaceTip = ({ className }: MoreAboutSubspaceTipProps) => {
  const { t } = useTranslation();

  const handleClick = () => {
    toast.info(t("The doc is coming soon!"));
  };

  return (
    <Button variant="ghost" size="sm" className={cn("flex items-center gap-2", className)} onClick={handleClick}>
      <HelpCircle className="h-4 w-4" />
      {t("Learn about subspaces")}
    </Button>
  );
};
