import { useState, useMemo, useEffect } from "react";
import { workspaceApi } from "@/apis/workspace";
import useWorkspaceStore, { useFetchMembers } from "@/stores/workspace-store";
import type { WorkspaceMember, WorkspaceMemberListResponse } from "@idea/contracts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, UserPlus, MoreHorizontal, UserMinus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { displayUserName } from "@/lib/auth";
import { useRefCallback } from "@/hooks/use-ref-callback";
import { showAddWorkspaceMemberModal } from "./add-workspace-member-modal";

const MemberManagementPanel = () => {
  const { t } = useTranslation();
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const workspaceId = currentWorkspace?.id;
  const [searchQuery, setSearchQuery] = useState("");
  const [roleChanging, setRoleChanging] = useState<Record<string, boolean>>({});

  // Get members from global store using new structure
  const members = useWorkspaceStore((state) => state.workspaceMembers);
  const { run: fetchMembers, loading: fetchMembersLoading } = useFetchMembers();

  // Fetch members on component mount and when workspaceId changes
  useEffect(() => {
    if (!workspaceId) return;
    fetchMembers(workspaceId);
  }, []);

  // Filter members based on search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) {
      return members;
    }

    const query = searchQuery.toLowerCase();
    return members.filter((member) => {
      const displayName = displayUserName(member.user).toLowerCase();
      const email = member.user?.email?.toLowerCase() || "";
      return displayName.includes(query) || email.includes(query);
    });
  }, [members, searchQuery]);

  // Use useRefCallback for stable handler references
  const handleAddMembers = useRefCallback(async () => {
    if (!workspaceId) return;

    await showAddWorkspaceMemberModal({
      workspaceId,
      title: t("Add Members to Workspace"),
    });
  });

  const handleChangeRole = useRefCallback(async (userId: string, newRole: WorkspaceMember["role"]) => {
    if (!workspaceId) return;
    setRoleChanging((r) => ({ ...r, [userId]: true }));
    try {
      // TODO: do we need to notify the user that the role has been changed, eg: promoted to admin?
      await workspaceApi.updateWorkspaceMember(workspaceId, userId, { role: newRole });
      // Refresh members from store
      await fetchMembers(workspaceId);
    } finally {
      setRoleChanging((r) => ({ ...r, [userId]: false }));
    }
  });

  const handleRemove = useRefCallback(async (userId: string) => {
    if (!workspaceId) return;
    setRoleChanging((r) => ({ ...r, [userId]: true }));
    try {
      await workspaceApi.removeWorkspaceMember(workspaceId, userId);
      // Refresh members from store
      await fetchMembers(workspaceId);
    } finally {
      setRoleChanging((r) => ({ ...r, [userId]: false }));
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {t("Members")}
            {members.length > 0 && <> ({searchQuery.trim() ? `${filteredMembers.length}/${members.length}` : members.length})</>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search bar and add button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t("Search members")} className="pl-10 pr-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Button variant="default" onClick={handleAddMembers}>
              <UserPlus className="h-4 w-4 mr-2" />
              {t("Add member")}
            </Button>
          </div>

          {/* Members list */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("User")}</TableHead>
                  <TableHead>{t("Role")}</TableHead>
                  <TableHead className="w-12 text-center">{t("Operations")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={member.user?.imageUrl || undefined} alt={member.user?.displayName || member.userId} />
                            <AvatarFallback>{displayUserName(member.user)[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="font-medium">{displayUserName(member.user)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={member.role}
                          disabled={roleChanging[member.userId] || member.role === "OWNER"}
                          onValueChange={(v) => handleChangeRole(member.userId, v as WorkspaceMember["role"])}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MEMBER">{t("Member")}</SelectItem>
                            <SelectItem value="ADMIN">{t("Admin")}</SelectItem>
                            <SelectItem value="OWNER">{t("Owner")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={member.role === "OWNER" || roleChanging[member.userId]}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleRemove(member.userId)} className="text-destructive focus:text-destructive">
                                <UserMinus className="h-4 w-4 mr-2" />
                                {t("Remove user from workspace")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      {searchQuery.trim() ? t("No members found matching your search") : t("No members found")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {fetchMembersLoading && <Spinner className="mt-4" text={t("Loading...")} />}
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberManagementPanel;
