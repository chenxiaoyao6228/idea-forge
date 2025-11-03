import * as React from "react";
import { useSpinDelay } from "spin-delay";
import { cn } from "../shadcn/utils";
import { Button, type ButtonProps } from "../shadcn/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../shadcn/ui/tooltip";
import { RotateCw, Check, X } from "lucide-react";

export const StatusButton = React.forwardRef<
  HTMLButtonElement,
  ButtonProps & {
    status: "pending" | "success" | "error" | "idle";
    message?: string | null;
    spinDelay?: Parameters<typeof useSpinDelay>[1];
  }
>(({ message, status, className, children, spinDelay, ...props }, ref) => {
  const delayedPending = useSpinDelay(status === "pending", {
    delay: 400,
    minDuration: 300,
    ...spinDelay,
  });
  const companion = {
    pending: delayedPending ? (
      <output className="inline-flex h-6 w-6 items-center justify-center" title="loading">
        <RotateCw className="animate-spin" />
      </output>
    ) : null,
    success: (
      <output className="inline-flex h-6 w-6 items-center justify-center" title="success">
        <Check />
      </output>
    ),
    error: (
      <output className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive" title="error">
        <X className="text-destructive-foreground" />
      </output>
    ),
    idle: null,
  }[status];

  return (
    <Button ref={ref} className={cn("flex justify-center gap-4", className)} {...props}>
      <div>{children}</div>
      {message ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>{companion}</TooltipTrigger>
            <TooltipContent>{message}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        companion
      )}
    </Button>
  );
});
StatusButton.displayName = "Button";
