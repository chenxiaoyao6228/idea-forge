import { cn } from '@idea/ui/shadcn/utils';
import { AlertCircle } from "lucide-react";
import { Button } from '@idea/ui/shadcn/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@idea/ui/shadcn/ui/alert';
import { markdownToHtml } from "./util";
import { useTranslation } from "react-i18next";

interface AIResultPanelProps {
  result?: string;
  error?: {
    message: string;
    code?: string;
    action?: {
      label: string;
      handler: () => void;
    };
  } | null;
  className?: string;
}

export default function AIResultPanel({ result, error, className }: AIResultPanelProps) {
  const { t } = useTranslation();

  if (error) {
    return (
      <div className="bg-popover dark:bg-popover mb-4  ">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("Error")}</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>{error.message}</p>
            {error.action && (
              <Button variant="outline" size="sm" onClick={error.action.handler}>
                {error.action.label}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!result) return null;

  const resultHtml = markdownToHtml(result);

  return (
    <div
      className={cn(
        "relative mb-4 max-h-75 overflow-x-hidden overflow-y-auto custom-scrollbar rounded-lg border word-wrap",
        "bg-popover dark:bg-popover p-4 shadow-md",
        "prose tiptap dark:prose-invert max-w-none",
        className,
      )}
    >
      <div dangerouslySetInnerHTML={{ __html: resultHtml }} />
    </div>
  );
}
