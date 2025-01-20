import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AIResultPanelProps {
  resultHtml?: string;
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

export default function AIResultPanel({ resultHtml, error, className }: AIResultPanelProps) {
  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          <p>{error.message}</p>
          {error.action && (
            <Button variant="outline" size="sm" onClick={error.action.handler}>
              {error.action.label}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (!resultHtml) return null;

  return (
    <div
      className={cn(
        "relative mb-4 max-h-75 overflow-x-hidden overflow-y-auto custom-scrollbar rounded-lg border word-wrap",
        "bg-background/95 dark:bg-background/95 p-4 shadow-md",
        "dark:supports-[backdrop-filter]:bg-background/60",
        "prose tiptap dark:prose-invert max-w-none",
        className,
      )}
    >
      <div dangerouslySetInnerHTML={{ __html: resultHtml }} />
    </div>
  );
}
