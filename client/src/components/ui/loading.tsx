import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

interface LoadingProps {
  fullScreen?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function Loading({ fullScreen = false, size = "md", className }: LoadingProps) {
  return (
    <div className={cn("flex justify-center items-center", fullScreen ? "h-screen" : "h-full w-full", className)}>
      <Spinner size={size} />
    </div>
  );
}
