import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus } from "lucide-react";
import { SubspaceType } from "@idea/contracts";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { SubspaceMenu } from "./subspace-menu";
import { useAllSubspaces } from "@/stores/subspace-store";
import { showCreateSubspaceModal } from "./create-subspace-dialog";
import { useTimeFormat } from "@/hooks/use-time-format";
import { useSubspaceLabels } from "@/hooks/use-subspace-labels";
import { SubspaceIcon } from "@/components/subspace-icon";

interface SubspaceTableProps {
  workspaceId: string;
  selectedSubspaceId?: string;
}

type FilterStatus = "all" | "archived" | "not_archived";
type FilterManager = "all" | string;
type FilterPermission = "all" | SubspaceType;

export function SubspaceTable({ workspaceId, selectedSubspaceId }: SubspaceTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("not_archived");
  const [managerFilter, setManagerFilter] = useState<FilterManager>("all");
  const [permissionFilter, setPermissionFilter] = useState<FilterPermission>("all");
  const { t } = useTranslation();
  const { formatSmartRelative } = useTimeFormat();
  const { getSubspaceTypeLabel } = useSubspaceLabels();

  const subspaces = useAllSubspaces();

  // Get unique managers for filter (using admins)
  const admins = useMemo(() => {
    const uniqueAdmins = new Set<string>();
    subspaces.forEach((subspace) => {
      if (subspace.members && subspace.members.length > 0) {
        subspace.members.forEach((admin) => {
          uniqueAdmins.add(admin?.user?.displayName || admin?.user?.email || "");
        });
      }
    });
    return Array.from(uniqueAdmins);
  }, [subspaces]);

  // Filter and search subspaces
  const filteredSubspaces = useMemo(() => {
    return subspaces
      .filter((subspace) => {
        // Search filter
        const matchesSearch = subspace.name.toLowerCase().includes(searchQuery.toLowerCase());

        // Status filter
        const matchesStatus =
          statusFilter === "all" || (statusFilter === "archived" && subspace.archivedAt) || (statusFilter === "not_archived" && !subspace.archivedAt);

        // Manager filter
        const matchesManager =
          managerFilter === "all" ||
          (subspace.members && subspace.members.length > 0 && subspace.members.some((admin) => admin.user.displayName === managerFilter));

        // Permission filter
        const matchesPermission = permissionFilter === "all" || subspace.type === permissionFilter;

        return matchesSearch && matchesStatus && matchesManager && matchesPermission;
      })
      .filter((subspace) => subspace.type !== SubspaceType.PERSONAL);
  }, [subspaces, searchQuery, statusFilter, managerFilter, permissionFilter]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("Manage subspaces")}</CardTitle>
            <CardDescription>{t("You can browse and manage subspaces here")}</CardDescription>
          </div>
          <Button onClick={() => showCreateSubspaceModal({ workspaceId })}>
            <Plus className="h-4 w-4 mr-1" />
            {t("Create subspace")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input placeholder={t("Search subspaces")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>

          <Select value={statusFilter} onValueChange={(value: FilterStatus) => setStatusFilter(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All")}</SelectItem>
              <SelectItem value="not_archived">{t("Not Archived")}</SelectItem>
              <SelectItem value="archived">{t("Archived")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={managerFilter} onValueChange={(value: FilterManager) => setManagerFilter(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All Admins")}</SelectItem>
              {admins.map((manager) => (
                <SelectItem key={manager} value={manager}>
                  {manager}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={permissionFilter} onValueChange={(value: FilterPermission) => setPermissionFilter(value)}>
            <SelectTrigger className="min-w-[160px] max-w-[300px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All Permission Types")}</SelectItem>
              <SelectItem value={SubspaceType.WORKSPACE_WIDE}>
                <div className="flex items-center gap-2">
                  <SubspaceIcon type={SubspaceType.WORKSPACE_WIDE} size="sm" withBackground />
                  <span>{t("Workspace-wide Space")}</span>
                </div>
              </SelectItem>
              <SelectItem value={SubspaceType.PUBLIC}>
                <div className="flex items-center gap-2">
                  <SubspaceIcon type={SubspaceType.PUBLIC} size="sm" withBackground />
                  <span>{t("Public Space")}</span>
                </div>
              </SelectItem>
              <SelectItem value={SubspaceType.INVITE_ONLY}>
                <div className="flex items-center gap-2">
                  <SubspaceIcon type={SubspaceType.INVITE_ONLY} size="sm" withBackground />
                  <span>{t("Invitation Space")}</span>
                </div>
              </SelectItem>
              <SelectItem value={SubspaceType.PRIVATE}>
                <div className="flex items-center gap-2">
                  <SubspaceIcon type={SubspaceType.PRIVATE} size="sm" withBackground />
                  <span>{t("Private Space")}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            {/* header */}
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">{t("Subspace")}</TableHead>
                <TableHead>{t("Type")}</TableHead>
                <TableHead>{t("Admins")}</TableHead>
                <TableHead>{t("Last Modified")}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredSubspaces.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchQuery || statusFilter !== "all" || managerFilter !== "all" || permissionFilter !== "all"
                      ? t("No subspaces match your filters")
                      : t("No subspaces found")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubspaces.map((subspace) => (
                  <TableRow
                    key={subspace.id}
                    className={cn(subspace.archivedAt && "opacity-60", selectedSubspaceId === subspace.id && "bg-accent/50 border-l-4 border-l-primary")}
                  >
                    {/* name */}
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <SubspaceIcon type={subspace.type as SubspaceType} size="lg" withBackground />
                        <div>
                          <div className="font-medium">{subspace.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {subspace.memberCount} {t("people")} | {t("Joined")}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    {/* type */}
                    <TableCell>
                      <Badge variant="secondary" className={cn("text-xs", subspace.type === SubspaceType.WORKSPACE_WIDE && "bg-pink-100 text-pink-800")}>
                        {getSubspaceTypeLabel(subspace.type as SubspaceType)}
                      </Badge>
                    </TableCell>

                    {/* admin */}
                    <TableCell>
                      {subspace.members && subspace.members.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">
                            {subspace.members.length === 1
                              ? subspace.members[0].user.displayName || subspace.members[0].user.email
                              : `${subspace.members[0].user.displayName || subspace.members[0].user.email} ${t("and")} ${subspace.members.length - 1} ${t("others")}`}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    {/* last modified */}
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{formatSmartRelative(subspace.updatedAt)}</span>
                    </TableCell>
                    {/* more */}
                    <TableCell>
                      <SubspaceMenu subspaceId={subspace.id} subspaceName={subspace.name} subspaceType={subspace.type} workspaceId={workspaceId} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
