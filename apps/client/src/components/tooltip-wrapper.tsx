import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@idea/ui/shadcn/ui/tooltip";

interface TooltipWrapperProps {
  children: React.ReactNode;
  disabled: boolean;
  tooltip: string;
}

export function TooltipWrapper({ children, disabled, tooltip }: TooltipWrapperProps) {
  if (disabled) {
    return <>{children}</>;
  }

  if (!tooltip) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-block">{children}</div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
