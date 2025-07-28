import React, { useEffect, useMemo, useState } from "react";
import { workspaceApi } from "@/apis/workspace";
import { userApi } from "@/apis/user";
import useWorkspaceStore from "@/stores/workspace";
import type { WorkspaceMember, WorkspaceMemberListResponse, WorkspaceMemberListResponseSchema } from "@idea/contracts";
import type { User } from "@idea/contracts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";

const MemberManagementPanel = () => {
  const { t } = useTranslation();
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const workspaceId = currentWorkspace?.id;
  const [members, setMembers] = useState<WorkspaceMemberListResponse>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [addUser, setAddUser] = useState<User | null>(null);
  const [addRole, setAddRole] = useState<WorkspaceMember["role"]>("MEMBER");
  const [loading, setLoading] = useState(false);
  const [roleChanging, setRoleChanging] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    workspaceApi
      .getWorkspaceMembers(workspaceId)
      .then((res: any) => {
        setMembers(res || []);
      })
      .finally(() => setLoading(false));
  }, [workspaceId, setMembers]);

  useEffect(() => {
    if (!search) {
      setSearchResults([]);
      return;
    }
    userApi.search({ query: search, page: 1, limit: 10, sortBy: "createdAt" }).then((res) => {
      setSearchResults((res.data as User[]) || []);
    });
  }, [search]);

  const handleAdd = async () => {
    if (!addUser || !workspaceId) return;
    setIsAdding(true);
    await workspaceApi.addWorkspaceMember(workspaceId, { userId: addUser.id, role: addRole });
    const res = (await workspaceApi.getWorkspaceMembers(workspaceId)) as any;
    setMembers(res || []);
    setAddUser(null);
    setAddRole("MEMBER");
    setSearch("");
    setIsAdding(false);
  };

  const handleChangeRole = async (userId: string, newRole: WorkspaceMember["role"]) => {
    if (!workspaceId) return;
    setRoleChanging((r) => ({ ...r, [userId]: true }));
    await workspaceApi.updateWorkspaceMember(workspaceId, userId, { role: newRole });
    const res = (await workspaceApi.getWorkspaceMembers(workspaceId)) as any;
    setMembers(res || []);
    setRoleChanging((r) => ({ ...r, [userId]: false }));
  };

  const handleRemove = async (userId: string) => {
    if (!workspaceId) return;
    setRoleChanging((r) => ({ ...r, [userId]: true }));
    await workspaceApi.removeWorkspaceMember(workspaceId, userId);
    const res = (await workspaceApi.getWorkspaceMembers(workspaceId)) as any;
    setMembers(res || []);
    setRoleChanging((r) => ({ ...r, [userId]: false }));
  };

  return (
    <div className="w-full mx-auto space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Input placeholder={t("Search member nickname or ID")} value={search} onChange={(e) => setSearch(e.target.value)} className="w-60" />
        <Button variant="default" onClick={() => setAddUser(null)}>
          {t("Add member")}
        </Button>
      </div>
      {addUser && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{t("Add member")}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Avatar>
              <AvatarImage src={addUser.imageUrl || undefined} alt={addUser.displayName || addUser.email} />
              <AvatarFallback>{addUser.displayName?.[0] || addUser.email[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-medium">{addUser.displayName || addUser.email}</div>
              <div className="text-xs text-muted-foreground">{addUser.email}</div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="add-role">{t("Role")}</Label>
              <Select value={addRole} onValueChange={(v) => setAddRole(v as WorkspaceMember["role"])}>
                <SelectTrigger id="add-role" className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">{t("Member")}</SelectItem>
                  <SelectItem value="ADMIN">{t("Admin")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} disabled={isAdding} className="ml-2">
              {t("Confirm add")}
            </Button>
            <Button variant="outline" onClick={() => setAddUser(null)} className="ml-2">
              {t("Cancel")}
            </Button>
          </CardContent>
        </Card>
      )}
      {search && searchResults.length > 0 && !addUser && (
        <Card className="mb-4">
          <CardContent className="p-2">
            {searchResults.map((user) => (
              <div key={user.id} className="flex items-center gap-2 p-2 cursor-pointer hover:bg-accent rounded" onClick={() => setAddUser(user)}>
                <Avatar>
                  <AvatarImage src={user.imageUrl || undefined} alt={user.displayName || user.email} />
                  <AvatarFallback>{user.displayName?.[0] || user.email[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">{user.displayName || user.email}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>{t("Member list")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("User")}</TableHead>
                <TableHead>{t("Role")}</TableHead>
                <TableHead>{t("Action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarImage src={member.user?.imageUrl || undefined} alt={member.user?.displayName || member.userId} />
                        <AvatarFallback>{member.user?.displayName || member.user?.email || member.userId?.[0]}</AvatarFallback>
                      </Avatar>
                      <span>{member.user?.displayName || member.user?.email || member.userId}</span>
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
                    {member.role !== "OWNER" && (
                      <Button variant="destructive" onClick={() => handleRemove(member.userId)} disabled={roleChanging[member.userId]} size="sm">
                        {t("Remove")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {loading && <Spinner className="mt-4" text={t("Loading...")} />}
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberManagementPanel;
