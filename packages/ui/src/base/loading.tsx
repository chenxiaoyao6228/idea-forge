import { cn } from "../shadcn/utils";
import { Spinner } from "./spinner";

interface LoadingProps {
  fullScreen?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  id?: string;
}

export default function Loading({ fullScreen = false, size = "md", className, id }: LoadingProps) {
  return (
    <div className={cn("flex justify-center items-center", fullScreen ? "h-screen" : "h-full w-full", className)} id={id}>
      <Spinner size={size} />
    </div>
  );
}
