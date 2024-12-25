import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserInfo } from "@/stores/user";

export function UserAvatar({ user }: { user: UserInfo | null }) {
  if (!user) return null;

  return (
    <Avatar className="h-7 w-7">
      <AvatarImage src={user.imageUrl} />
      <AvatarFallback>{user.displayName.slice(0, 2)}</AvatarFallback>
    </Avatar>
  );
}
