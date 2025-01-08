import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset?: () => void;
}

export default function ErrorBoundary({ error, reset = () => window.location.reload() }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-bold text-destructive">Something went wrong!</h2>
      {import.meta.env.DEV && (
        <div className="max-w-2xl rounded-lg bg-muted p-4">
          <p className="font-mono text-sm">{error?.message}</p>
          {error?.stack && <pre className="mt-2 max-h-96 overflow-auto text-xs opacity-70">{error.stack}</pre>}
        </div>
      )}
      <Button onClick={reset} variant="outline" size="lg">
        Try again
      </Button>
    </div>
  );
}
