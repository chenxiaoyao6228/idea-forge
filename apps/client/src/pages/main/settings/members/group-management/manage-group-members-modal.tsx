import { useEffect, useState } from "react";
import { useOrderedGroups, useAddUserToGroup, useRemoveUserFromGroup } from "@/stores/group-store";
import { Input } from '@idea/ui/shadcn/ui/input';
import { Button } from '@idea/ui/shadcn/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@idea/ui/shadcn/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@idea/ui/shadcn/ui/dialog';
import { useTranslation } from "react-i18next";
import { Search, UserPlus, UserMinus } from "lucide-react";
import { userApi } from "@/apis/user";
import { showConfirmModal } from '@/components/ui/confirm-modal';
import type { ManageGroupMembersModalProps } from "./types";

export const ManageGroupMembersModal = ({ open, onClose, groupId, refreshGroup }: ManageGroupMembersModalProps) => {
  const { t } = useTranslation();
  const orderedGroups = useOrderedGroups();
  const { run: addUserToGroup } = useAddUserToGroup();
  const { run: removeUserFromGroup } = useRemoveUserFromGroup();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [group, setGroup] = useState<any | null>(null);

  // Only update local group state when open, groupId, or orderedGroups changes
  useEffect(() => {
    if (!open || !groupId) return;
    const found = orderedGroups.find((g) => g.id === groupId) || null;
    setGroup(found);
  }, [open, groupId, orderedGroups]);

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
    await addUserToGroup({ groupId: groupId!, userId });
    await refreshGroup();
  };

  const handleRemove = async (userId: string) => {
    showConfirmModal({
      title: t("Remove Member"),
      description: t("Are you sure you want to remove this member from the group?"),
      confirmVariant: "destructive",
      onConfirm: async () => {
        try {
          await removeUserFromGroup({ groupId: groupId!, userId });
          await refreshGroup();
          return true;
        } catch (error) {
          return false;
        }
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-black">
            {t("Manage Members")} - {group?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Search users */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={t("Search users...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              aria-label="Search users to add"
            />
          </div>

          {/* User list */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {users.map((user) => {
              const inGroup = isInGroup(user.id);
              return (
                <div key={user.id} className="flex items-center justify-between p-2 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.imageUrl || undefined} alt={user.displayName || user.email} />
                      <AvatarFallback className="text-xs bg-gray-100 text-black">{user.displayName?.[0] || user.email[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-black">{user.displayName || user.email}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <Button
                    variant={inGroup ? "destructive" : "default"}
                    size="sm"
                    onClick={() => {
                      if (inGroup) {
                        handleRemove(user.id);
                      } else {
                        handleAdd(user.id);
                      }
                    }}
                    className={inGroup ? "bg-red-600 hover:bg-red-700 text-white" : "bg-black hover:bg-gray-800 text-white"}
                    aria-label={inGroup ? `Remove ${user.displayName || user.email} from group` : `Add ${user.displayName || user.email} to group`}
                  >
                    {inGroup ? (
                      <>
                        <UserMinus className="h-4 w-4 mr-1" />
                        {t("Remove")}
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-1" />
                        {t("Add")}
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
