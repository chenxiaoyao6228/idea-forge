import type React from "react";
import { Loader2 } from "lucide-react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = "md", text }) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className="flex items-center justify-center space-x-2">
      <Loader2 className={`animate-spin ${sizeClasses[size]}`} />
      {text && <span className="text-sm font-medium">{text}</span>}
    </div>
  );
};
