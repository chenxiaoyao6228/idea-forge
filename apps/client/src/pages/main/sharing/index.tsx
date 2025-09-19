import { useBoolean } from "react-use";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import React from "react";
import { PermissionLevel } from "@idea/contracts";
import { documentApi } from "@/apis/document";
import useWorkspaceStore from "@/stores/workspace-store";
import { useMemberSearch } from "@/hooks/use-member-search";

type PendingId = {
  id: string;
  type: "user" | "group";
};

interface ShareButtonProps {
  documentId: string;
}

export function ShareButton({ documentId }: ShareButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useBoolean(false);
  const [pendingIds, setPendingIds] = React.useState<PendingId[]>([]);
  const [permission, setPermission] = React.useState<PermissionLevel>(PermissionLevel.READ);
  const [searchQuery, setSearchQuery] = React.useState("");
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const workspaceId = currentWorkspace?.id;

  // Use the member search hook
  const { availableMembers, loading } = useMemberSearch({
    workspaceId,
    query: searchQuery,
    enabled: open && !!workspaceId,
  });

  const handleAddPendingId = (id: string, type: "user" | "group") => {
    setPendingIds((prev) => (prev.some((item) => item.id === id && item.type === type) ? prev : [...prev, { id, type }]));
  };

  const handleRemovePendingId = (id: string) => {
    setPendingIds((prev) => prev.filter((item) => item.id !== id));
  };

  const handleShare = async () => {
    try {
      if (workspaceId) {
        await documentApi.shareDocument(documentId, {
          targetUserIds: pendingIds.filter(({ type }) => type === "user").map(({ id }) => id),
          targetGroupIds: pendingIds.filter(({ type }) => type === "group").map(({ id }) => id),
          permission: permission as "READ" | "EDIT",
          includeChildDocuments: true,
          workspaceId,
        });
      }

      setPendingIds([]);
      setSearchQuery("");
    } catch (error) {
      toast.error(t("Failed to share document"));
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost">{t("Share")}</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleShare();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Input placeholder={t("Search users or groups...")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              {searchQuery && (
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {availableMembers.map((member) => (
                      <div
                        key={`${member.type}-${member.id}`}
                        className="flex items-center justify-between p-2 hover:bg-accent rounded-md cursor-pointer"
                        onClick={() => handleAddPendingId(member.id, member.type)}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar>
                            <AvatarImage src={member.avatar || ""} />
                            <AvatarFallback>{member.type === "user" ? member.name[0] : member.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{member.name}</p>
                            {member.email && <p className="text-xs text-muted-foreground">{member.email}</p>}
                            {member.memberCount && <p className="text-xs text-muted-foreground">{t("{{count}} members", { count: member.memberCount })}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
            {pendingIds.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("Selected")}</p>
                <div className="flex flex-wrap gap-2">
                  {pendingIds.map(({ id, type }) => {
                    const member = availableMembers.find((m) => m.id === id && m.type === type);
                    return (
                      <Badge key={id} variant="secondary" className="flex items-center gap-1">
                        {member?.name || id}
                        <button type="button" onClick={() => handleRemovePendingId(id)} className="ml-1 hover:text-destructive">
                          ×
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button type="button" variant={permission === "READ" ? "default" : "outline"} onClick={() => setPermission("READ")}>
                {t("Can view")}
              </Button>
              <Button type="button" variant={permission === "EDIT" ? "default" : "outline"} onClick={() => setPermission("EDIT")}>
                {t("Can edit")}
              </Button>
            </div>
            <Button type="submit" className="w-full" disabled={pendingIds.length === 0}>
              {t("Share")}
            </Button>
          </form>
        </div>
        <Separator />
        {/* <AccessControlList documentId={documentId} /> */}
      </PopoverContent>
    </Popover>
  );
}
