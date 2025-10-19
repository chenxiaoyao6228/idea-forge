import { Editor } from "@tiptap/react";
import { Button } from '@idea/ui/shadcn/ui/button';
import { Separator } from '@idea/ui/shadcn/ui/separator';
import { Pencil, Unlink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from '@idea/ui/shadcn/ui/tooltip';
import { useTranslation } from "react-i18next";

interface LinkViewBlockProps {
  editor: Editor;
  link?: string;
  onClear: () => void;
  onEdit: () => void;
}

export function LinkViewBlock({ link, onClear, onEdit }: LinkViewBlockProps) {
  const { t } = useTranslation();
  const truncate = (str: string, length: number) => {
    return str?.length > length ? str.substring(0, length) + "…" : str;
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-background rounded-lg shadow-sm border">
      <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm underline break-all">
        {truncate(link || "", 50)}
      </a>
      {link && <Separator orientation="vertical" className="h-4" />}
      <div className="flex flex-nowrap">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("Edit link")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onClear}>
              <Unlink className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("Remove link")}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
