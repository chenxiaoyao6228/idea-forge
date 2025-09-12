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
import useSubSpaceStore from "@/stores/subspace";
import { CreateSubspaceDialog } from "./create-subspace-dialog";
import { useTimeFormat } from "@/hooks/use-time-format";

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

  const subspaces = useSubSpaceStore((state) => state.allSubspaces);

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

  const getSubspaceTypeIcon = (type: SubspaceType) => {
    switch (type) {
      case SubspaceType.PUBLIC:
        return "公";
      case SubspaceType.INVITE_ONLY:
        return "邀";
      case SubspaceType.PRIVATE:
        return "私";
      case SubspaceType.PERSONAL:
        return "个";
      case SubspaceType.WORKSPACE_WIDE:
        return "全";
      default:
        return "?";
    }
  };

  const getSubspaceTypeColor = (type: SubspaceType) => {
    switch (type) {
      case SubspaceType.PUBLIC:
        return "bg-green-500";
      case SubspaceType.INVITE_ONLY:
        return "bg-yellow-500";
      case SubspaceType.PRIVATE:
        return "bg-red-500";
      case SubspaceType.PERSONAL:
        return "bg-blue-500";
      case SubspaceType.WORKSPACE_WIDE:
        return "bg-pink-500";
      default:
        return "bg-gray-500";
    }
  };

  const getSubspaceTypeLabel = (type: SubspaceType) => {
    switch (type) {
      case SubspaceType.PUBLIC:
        return t("Public Space");
      case SubspaceType.INVITE_ONLY:
        return t("Invitation Space");
      case SubspaceType.PRIVATE:
        return t("Private Space");
      case SubspaceType.PERSONAL:
        return t("Personal Space");
      case SubspaceType.WORKSPACE_WIDE:
        return t("All-member Space");
      default:
        return type;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("Manage subspaces")}</CardTitle>
            <CardDescription>{t("You can browse and manage subspaces here")}</CardDescription>
          </div>
          <CreateSubspaceDialog workspaceId={workspaceId}>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              {t("Create subspace")}
            </Button>
          </CreateSubspaceDialog>
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
              <SelectItem value={SubspaceType.WORKSPACE_WIDE}>{t("All-member Space")}</SelectItem>
              <SelectItem value={SubspaceType.PUBLIC}>{t("Public Space")}</SelectItem>
              <SelectItem value={SubspaceType.INVITE_ONLY}>{t("Invitation Space")}</SelectItem>
              <SelectItem value={SubspaceType.PRIVATE}>{t("Private Space")}</SelectItem>
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
                        <div
                          className={cn(
                            "w-8 h-8 rounded text-white text-sm flex items-center justify-center",
                            getSubspaceTypeColor(subspace.type as SubspaceType),
                          )}
                        >
                          {getSubspaceTypeIcon(subspace.type as SubspaceType)}
                        </div>
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
