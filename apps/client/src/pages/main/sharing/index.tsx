import { useBoolean } from "react-use";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { groupApi } from "@/apis/group";
// import { AccessControlList } from "./access-control-list";
import React from "react";
import { userApi } from "@/apis/user";
import { permissionApi } from "@/apis/permission";

type PendingId = {
  id: number | string;
  type: "user" | "group";
};

const shareSchema = z.object({
  query: z.string().min(1),
});

type ShareFormValues = z.infer<typeof shareSchema>;

interface ShareButtonProps {
  documentId: string;
}

export function ShareButton({ documentId }: ShareButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useBoolean(false);
  const [pendingIds, setPendingIds] = React.useState<PendingId[]>([]);
  const [permission, setPermission] = React.useState<"READ" | "EDIT">("READ");

  const form = useForm<ShareFormValues>({
    resolver: zodResolver(shareSchema),
    defaultValues: {
      query: "",
    },
  });

  const { data: usersRes } = useQuery<Awaited<ReturnType<typeof userApi.search>>>({
    queryKey: ["users", form.watch("query")],
    queryFn: () =>
      userApi.search({
        query: form.watch("query"),
        page: 1,
        limit: 100,
        sortBy: "createdAt",
      }),
    enabled: form.watch("query").length > 0,
  });

  const { data: groups } = useQuery({
    queryKey: ["groups", form.watch("query")],
    queryFn: () =>
      groupApi.list({
        query: form.watch("query"),
        page: 1,
        limit: 100,
        sortBy: "createdAt",
      }),
    enabled: form.watch("query").length > 0,
  });

  const handleAddPendingId = (id: number | string, type: "user" | "group") => {
    setPendingIds((prev) => [...prev, { id, type }]);
  };

  const handleRemovePendingId = (id: number | string) => {
    setPendingIds((prev) => prev.filter((item) => item.id !== id));
  };

  const handleShare = async () => {
    try {
      await Promise.all(
        pendingIds.map(async ({ id, type }) => {
          if (type === "user") {
            const user = usersRes?.data.find((u) => u.id === id);
            if (user) {
              // Use unified permission API
              await permissionApi.addUserPermission({
                userId: user.id,
                resourceType: "DOCUMENT",
                resourceId: documentId,
                permission,
              });
              toast.success(t("Added {{name}} to the document", { name: user.displayName }));
            }
          } else {
            const group = groups?.data.find((g) => g.id === id);
            if (group) {
              // Use unified permission API
              await permissionApi.addGroupPermission({
                groupId: id as string,
                resourceType: "DOCUMENT",
                resourceId: documentId,
                permission,
              });
              toast.success(t("Added {{name}} to the document", { name: group.name }));
            }
          }
        }),
      );

      setPendingIds([]);
      form.reset();
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
          <form onSubmit={form.handleSubmit(handleShare)} className="space-y-4">
            <div className="space-y-2">
              <Input placeholder={t("Search users or groups...")} {...form.register("query")} />
              {form.watch("query") && (
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {usersRes?.data.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-2 hover:bg-accent rounded-md cursor-pointer"
                        onClick={() => handleAddPendingId(user.id, "user")}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar>
                            <AvatarImage src={user.imageUrl || ""} />
                            <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{user.displayName}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {groups?.data.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center justify-between p-2 hover:bg-accent rounded-md cursor-pointer"
                        onClick={() => handleAddPendingId(group.id, "group")}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar>
                            <AvatarFallback>{group.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{group.name}</p>
                            <p className="text-xs text-muted-foreground">{t("{{count}} members", { count: group.members.length })}</p>
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
                    const user = type === "user" ? usersRes?.data.find((u) => u.id === id) : undefined;
                    const group = type === "group" ? groups?.data.find((g) => g.id === id) : undefined;
                    return (
                      <Badge key={id} variant="secondary" className="flex items-center gap-1">
                        {user ? user.displayName : group?.name}
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
