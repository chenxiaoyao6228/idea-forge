import * as React from "react";
import { Button, type ButtonProps } from '@idea/ui/shadcn/ui/button';
import { Icon } from '@idea/ui/base/icon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@idea/ui/shadcn/ui/tooltip';
import { cn } from '@idea/ui/shadcn/utils';
import { useSpinDelay } from "spin-delay";

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
      <output className="inline-flex h-6 w-6 items-center justify-center">
        <Icon name="Update" className="animate-spin" title="loading" />
      </output>
    ) : null,
    success: (
      <output className="inline-flex h-6 w-6 items-center justify-center">
        <Icon name="Check" title="success" />
      </output>
    ),
    error: (
      <output className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive">
        <Icon name="Cross1" className="text-destructive-foreground" title="error" />
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
