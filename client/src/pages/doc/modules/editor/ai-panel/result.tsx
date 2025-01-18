import { cn } from "@/lib/utils";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AIResultProps {
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

export default function AIResult({ result, error, className }: AIResultProps) {
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

  if (!result) return null;

  return (
    <div
      className={cn(
        "relative mb-4 max-h-75 overflow-x-hidden overflow-y-auto custom-scrollbar rounded-lg border word-wrap",
        "bg-background/95 dark:bg-background/95 p-4 shadow-md",
        "backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "dark:supports-[backdrop-filter]:bg-background/60",
        className,
      )}
    >
      <div dangerouslySetInnerHTML={{ __html: result }} />
    </div>
  );
}
