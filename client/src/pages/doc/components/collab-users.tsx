import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/pages/doc/stores/editor-store";

export function CollabUsers({
  className,
}: {
  className?: string;
}) {
  const { activeUsers } = useEditorStore();

  if (!activeUsers.length) return null;

  return (
    <div className={cn("ml-5 flex -space-x-2", className)}>
      {activeUsers.map((user) => {
        let { clientId, name, avatar, email } = user;
        if (!name) name = email || "Anonymous";

        return (
          <TooltipProvider key={clientId}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative inline-block">
                  <UserAvatar
                    user={{
                      displayName: name,
                      imageUrl: avatar || "",
                    }}
                    className="h-8 w-8 border-2 border-background"
                  />
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
                </div>
              </TooltipTrigger>
              <TooltipContent>{name}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}
