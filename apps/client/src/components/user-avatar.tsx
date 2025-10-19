import { Avatar, AvatarFallback, AvatarImage } from '@idea/ui/shadcn/ui/avatar';
import { cn } from '@idea/ui/shadcn/utils';

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
