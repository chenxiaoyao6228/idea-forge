import React, { useEffect, useState } from "react";
import useGroupStore from "@/stores/group";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, MoreVertical, X } from "lucide-react";
import { groupApi } from "@/apis/group";
import { userApi } from "@/apis/user";
import type { User } from "@idea/contracts";
import { confirmModal } from "@/components/ui/confirm-modal";

const ManageGroupMembersModal = ({
  open,
  onClose,
  groupId,
  refreshGroup,
}: { open: boolean; onClose: () => void; groupId: string | null; refreshGroup: () => Promise<void> }) => {
  const { t } = useTranslation();
  const groupStore = useGroupStore();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [group, setGroup] = useState<any | null>(null);

  // Only update local group state when open, groupId, or groupStore.orderedGroups changes
  useEffect(() => {
    if (!open || !groupId) return;
    const found = groupStore.orderedGroups.find((g) => g.id === groupId) || null;
    setGroup(found);
  }, [open, groupId, groupStore.orderedGroups]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    userApi.search({ query: search, page: 1, limit: 100, sortBy: "createdAt" }).then((res) => {
      setUsers((res.data as any[]) || []);
      setLoading(false);
    });
  }, [open, search]);

  const isInGroup = (userId: string) => group?.members?.some((m: any) => m.userId === userId);

  const handleAdd = async (userId: string) => {
    await groupStore.addUser(groupId!, userId);
    await refreshGroup();
    // setGroup will update automatically due to groupStore.orderedGroups change
  };

  const handleRemove = async (userId: string) => {
    await groupStore.removeUser(groupId!, userId);
    await refreshGroup();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Manage Group Members")}</DialogTitle>
        </DialogHeader>
        <Input placeholder={t("Search nickname")} value={search} onChange={(e) => setSearch(e.target.value)} className="mb-2" />
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {users.map((user) => {
            const inGroup = isInGroup(user.id);
            return (
              <div key={user.id} className="flex items-center gap-2">
                <Avatar>
                  <AvatarImage src={user.imageUrl || undefined} alt={user.displayName || user.email} />
                  <AvatarFallback>{user.displayName?.[0] || user.email[0]}</AvatarFallback>
                </Avatar>
                <span>{user.displayName || user.email}</span>
                <div className="ml-auto">
                  {inGroup ? (
                    <Button variant="outline" onClick={() => handleRemove(user.id)}>
                      {t("Remove")}
                    </Button>
                  ) : (
                    <Button variant="destructive" onClick={() => handleAdd(user.id)} disabled={inGroup}>
                      {t("Add")}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const GroupManagementPanel = () => {
  const { t } = useTranslation();
  const groupStore = useGroupStore();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [manageGroupId, setManageGroupId] = useState<string | null>(null);

  useEffect(() => {
    groupStore.fetch();
  }, []);

  const groups = groupStore.orderedGroups.filter((g) => !search || g.name.toLowerCase().includes(search.toLowerCase()));

  const handleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRename = (id: string, name: string) => {
    setRenameId(id);
    setRenameValue(name);
  };

  const handleRenameSubmit = async (id: string) => {
    await groupStore.update(id, { name: renameValue });
    setRenameId(null);
    setRenameValue("");
  };

  const handleDisband = async (id: string) => {
    confirmModal({
      title: t("Are you sure to disband this group?"),
      description: t("This action cannot be undone."),
      hideCancel: false,
      confirmVariant: "destructive",
      onConfirm: async () => {
        try {
          await groupStore.delete(id);
          return true;
        } catch (error) {
          return false;
        }
      },
    });
  };

  const handleCreate = async () => {
    await groupStore.create({ name: t("Unnamed Group") });
    await refreshGroup();
  };

  const refreshGroup = async () => {
    await groupStore.fetch();
  };

  return (
    <div className="w-full  mx-auto space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Input placeholder={t("Search group or member name")} value={search} onChange={(e) => setSearch(e.target.value)} className="w-60" />
        <Button variant="default" onClick={handleCreate}>
          {t("Create Group")}
        </Button>
      </div>
      <div className="space-y-2">
        {groups.map((group) => (
          <Card key={group.id} className="p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleExpand(group.id)}
                  className="mr-2"
                  aria-label={expanded[group.id] ? t("Collapse") : t("Expand")}
                >
                  {expanded[group.id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </Button>
                {renameId === group.id ? (
                  <>
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="w-32 ml-2"
                      onBlur={() => handleRenameSubmit(group.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameSubmit(group.id);
                      }}
                      autoFocus
                    />
                  </>
                ) : (
                  <span className="ml-2 font-medium">{group.name}</span>
                )}
                <span className="ml-2 text-xs text-muted-foreground">{group.members?.length || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setManageGroupId(group.id)}>
                  {t("Manage Members")}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={t("Manage group")}>
                      {" "}
                      <MoreVertical size={18} />{" "}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleRename(group.id, group.name)}>{t("Rename")}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDisband(group.id)}>{t("Disband")}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {expanded[group.id] && (
              <CardContent className="pt-2">
                {group.members && group.members.length > 0 ? (
                  <div className="space-y-2">
                    {group.members.map((member: any) => (
                      <div key={member.userId} className="flex items-center gap-2 p-1">
                        <Avatar>
                          <AvatarImage src={member.user?.imageUrl || undefined} alt={member.user?.displayName || member.userId} />
                          <AvatarFallback>{member.user?.displayName?.[0] || member.userId?.[0]}</AvatarFallback>
                        </Avatar>
                        <span>{member.user?.displayName || member.user?.email || member.userId}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            await groupStore.removeUser(group.id, member.userId);
                            await refreshGroup();
                          }}
                          aria-label={t("Remove")}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground p-2 text-center cursor-pointer" onClick={() => setManageGroupId(group.id)}>
                    {t("No members, click here to add")}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
      <ManageGroupMembersModal open={!!manageGroupId} onClose={() => setManageGroupId(null)} groupId={manageGroupId} refreshGroup={refreshGroup} />
    </div>
  );
};

export default GroupManagementPanel;
