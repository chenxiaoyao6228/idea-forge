import * as Sentry from "@sentry/react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getEnvVariable } from "@/lib/env";

interface FallbackProps {
  error: unknown;
  componentStack: string;
  eventId: string;
  resetError: () => void;
}

function ErrorFallback({ error, componentStack, resetError = () => window.location.reload() }: FallbackProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Page error:", error);

    // Only send to Sentry if DSN is configured
    if (getEnvVariable("CLIENT_SENTRY_DSN")) {
      Sentry.captureException(error, {
        contexts: {
          componentStack: { value: componentStack },
        },
      });
    }
  }, [error, componentStack]);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-bold text-destructive">Something went wrong!</h2>
      {import.meta.env.MODE === "development" && componentStack && (
        <div className="max-w-2xl rounded-lg bg-muted p-4">
          <pre className="mt-2 max-h-96 overflow-auto text-xs opacity-70">{componentStack}</pre>
        </div>
      )}
      <Button onClick={resetError} variant="outline" size="lg">
        Try again
      </Button>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export default function ErrorBoundary({ children }: ErrorBoundaryProps) {
  // Only use Sentry ErrorBoundary if DSN is configured
  if (!getEnvVariable("CLIENT_SENTRY_DSN")) {
    return <>{children}</>;
  }

  return (
    <Sentry.ErrorBoundary
      fallback={ErrorFallback}
      beforeCapture={(scope) => {
        scope.setTag("location", window.location.pathname);
        scope.setTag("environment", import.meta.env.MODE);
      }}
      showDialog={import.meta.env.PROD}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
