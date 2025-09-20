import { useEffect, useState } from "react";
import { useOrderedGroups, useFetchGroups, useCreateGroup, useUpdateGroup, useDeleteGroup, useRemoveUserFromGroup } from "@/stores/group-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Search, Plus, Users } from "lucide-react";
import { showConfirmModal } from "@/components/ui/confirm-modal";
import { GroupCard } from "./group-card";
import { ManageGroupMembersModal } from "./manage-group-members-modal";

export const GroupManagementPanel = () => {
  const { t } = useTranslation();
  const orderedGroups = useOrderedGroups();
  const { run: fetchGroups } = useFetchGroups();
  const { run: createGroup } = useCreateGroup();
  const { run: updateGroup } = useUpdateGroup();
  const { run: deleteGroup } = useDeleteGroup();
  const { run: removeUserFromGroup } = useRemoveUserFromGroup();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [manageGroupId, setManageGroupId] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const groups = orderedGroups.filter((g) => !search || g.name.toLowerCase().includes(search.toLowerCase()));

  const handleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRename = (id: string, name: string) => {
    showConfirmModal({
      title: t("Rename Group"),
      type: "dialog",
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="group-name" className="text-sm font-medium text-black">
              {t("Group Name")}
            </label>
            <Input id="group-name" defaultValue={name} placeholder={t("Enter group name")} className="w-full" />
          </div>
        </div>
      ),
      onConfirm: async () => {
        const input = document.getElementById("group-name") as HTMLInputElement;
        const newName = input?.value?.trim();
        if (newName && newName !== name) {
          await updateGroup({ id, data: { name: newName } });
          return true;
        }
        return false;
      },
    });
  };

  const handleDisband = async (id: string) => {
    showConfirmModal({
      title: t("Disband Group"),
      description: t("Are you sure you want to disband this group? This action cannot be undone."),
      confirmVariant: "destructive",
      onConfirm: async () => {
        try {
          await deleteGroup(id);
          return true;
        } catch (error) {
          return false;
        }
      },
    });
  };

  const handleCreate = async () => {
    await createGroup({ name: t("Unnamed Group") });
    await refreshGroup();
  };

  const refreshGroup = async () => {
    await fetchGroups();
  };

  const handleRemoveMember = async (groupId: string, userId: string) => {
    await removeUserFromGroup({ groupId, userId });
    await refreshGroup();
  };

  return (
    <div className="space-y-6">
      {/* Header with search and create button */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={t("Search groups or members...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            aria-label="Search groups or members"
          />
        </div>
        <Button onClick={handleCreate} className="bg-black hover:bg-gray-800 text-white">
          <Plus className="h-4 w-4 mr-2" />
          {t("Create Group")}
        </Button>
      </div>

      {/* Groups grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            expanded={expanded[group.id]}
            onToggleExpand={handleExpand}
            onRename={handleRename}
            onDisband={handleDisband}
            onManageMembers={setManageGroupId}
            onRemoveMember={handleRemoveMember}
          />
        ))}
      </div>

      {/* Empty state */}
      {groups.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-black">{t("No groups found")}</h3>
          <p className="text-muted-foreground mb-4">{search ? t("Try adjusting your search terms") : t("Create your first group to get started")}</p>
          {!search && (
            <Button onClick={handleCreate} className="bg-black hover:bg-gray-800 text-white">
              <Plus className="h-4 w-4 mr-2" />
              {t("Create Group")}
            </Button>
          )}
        </div>
      )}

      {/* Manage Group Members Modal */}
      <ManageGroupMembersModal open={!!manageGroupId} onClose={() => setManageGroupId(null)} groupId={manageGroupId} refreshGroup={refreshGroup} />
    </div>
  );
};
