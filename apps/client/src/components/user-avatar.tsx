import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function UserAvatar({
  user,
  className,
}: {
  user: {
    displayName: string;
    imageUrl: string;
  } | null;
  className?: string;
}) {
  if (!user) return null;

  return (
    <Avatar className={cn("h-7 w-7", className)}>
      <AvatarImage src={user.imageUrl} />
      <AvatarFallback>{user.displayName.slice(0, 2)}</AvatarFallback>
    </Avatar>
  );
}
