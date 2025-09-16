import { useTranslation } from "react-i18next";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, UserPlus, Users, MoreHorizontal, UserMinus, X } from "lucide-react";
import { SubspaceSettingsResponse, PermissionLevel, SubspaceRole } from "@idea/contracts";
import { SubspaceTypeSelector } from "../subspace-type-selector";
import { PermissionLevelSelector } from "@/components/ui/permission-level-selector";
import { displayUserName } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { subspaceApi } from "@/apis/subspace";
import { toast } from "sonner";
import useUserStore from "@/stores/user";
import { showAddSubspaceMemberModal } from "../add-subspace-member-modal";
import { useRefCallback } from "@/hooks/use-ref-callback";

interface MembersPermissionsTabProps {
  settings: SubspaceSettingsResponse;
  onSettingsChange: (settings: Partial<SubspaceSettingsResponse["subspace"]>) => void;
}

export function MembersPermissionsTab({ settings, onSettingsChange }: MembersPermissionsTabProps) {
  const { t } = useTranslation();
  const userInfo = useUserStore((state) => state.userInfo);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter members based on search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) {
      return settings.subspace.members;
    }

    const query = searchQuery.toLowerCase();
    return settings.subspace.members.filter((member) => {
      const displayName = displayUserName(member.user).toLowerCase();
      const email = member.user.email.toLowerCase();
      return displayName.includes(query) || email.includes(query);
    });
  }, [settings.subspace.members, searchQuery]);

  const handleTypeChange = (type: any) => {
    // Auto-set initial permissions based on subspace type
    const permissionUpdates = getInitialPermissionsForSubspaceType(type);
    onSettingsChange({ type, ...permissionUpdates });
  };

  const handleMemberRoleChange = (memberId: string, newRole: SubspaceRole) => {
    // Find the member being updated
    const member = settings.subspace.members.find((m) => m.id === memberId);

    // Prevent users from changing their own role
    if (member && member.userId === userInfo?.id) {
      toast.error(t("You cannot change your own role"));
      return;
    }

    const updatedMembers = settings.subspace.members.map((member) => (member.id === memberId ? { ...member, role: newRole } : member));
    onSettingsChange({ members: updatedMembers });
  };

  const handleRemoveMember = async (memberId: string) => {
    // Find the member being removed
    const member = settings.subspace.members.find((m) => m.id === memberId);

    // Prevent users from removing themselves
    if (member && member.userId === userInfo?.id) {
      toast.error(t("You cannot remove yourself from the subspace"));
      return;
    }

    try {
      // Call API to remove member
      await subspaceApi.removeSubspaceMember(settings.subspace.id, memberId);

      // Note: No manual refresh needed here - websocket events will handle the refresh automatically
      // The SUBSPACE_MEMBER_LEFT event will trigger refreshSubspaceMembers()
    } catch (error) {
      console.error("Failed to remove member:", error);
      toast.error(t("Failed to remove member"));
    }
  };

  // Helper function to get initial permissions based on subspace type
  const getInitialPermissionsForSubspaceType = (subspaceType: string) => {
    switch (subspaceType) {
      case "WORKSPACE_WIDE":
        return {
          subspaceAdminPermission: "OWNER" as PermissionLevel,
          subspaceMemberPermission: "OWNER" as PermissionLevel,
          // Non-subspace member permissions are not applicable for WORKSPACE_WIDE
        };
      case "PUBLIC":
        return {
          subspaceAdminPermission: "OWNER" as PermissionLevel,
          subspaceMemberPermission: "OWNER" as PermissionLevel,
          nonSubspaceMemberPermission: "COMMENT" as PermissionLevel,
        };
      case "INVITE_ONLY":
        return {
          subspaceAdminPermission: "OWNER" as PermissionLevel,
          subspaceMemberPermission: "OWNER" as PermissionLevel,
          nonSubspaceMemberPermission: "NONE" as PermissionLevel,
        };
      case "PRIVATE":
        return {
          subspaceAdminPermission: "OWNER" as PermissionLevel,
          subspaceMemberPermission: "OWNER" as PermissionLevel,
          nonSubspaceMemberPermission: "NONE" as PermissionLevel,
        };
      default:
        return {};
    }
  };

  const handlePermissionChange = (permissionType: string, value: PermissionLevel) => {
    // Validate permission changes
    if (validatePermissionChange(permissionType, value)) {
      onSettingsChange({ [permissionType]: value });
    }
  };

  const handleAddMember = () => {
    showAddSubspaceMemberModal({
      subspaceId: settings.subspace.id,
      subspaceName: settings.subspace.name,
      workspaceId: settings.subspace.workspaceId,
    });
  };

  // Validation function to prevent invalid permission combinations
  const validatePermissionChange = useRefCallback((permissionType: string, newValue: PermissionLevel) => {
    const currentSettings = settings.subspace;

    // Subspace Admins should always have OWNER permissions
    if (permissionType === "subspaceAdminPermission" && newValue !== "OWNER") {
      console.warn("Subspace Admins must have OWNER permissions");
      return false;
    }

    // Non-members should not have higher permissions than members
    if (permissionType === "nonSubspaceMemberPermission") {
      if (newValue === "OWNER" || newValue === "MANAGE") {
        console.warn("Non-subspace members cannot have higher permissions than subspace members");
        return false;
      }
    }

    // Members should not have lower permissions than non-members (except for NONE)
    if (permissionType === "subspaceMemberPermission") {
      const nonMemberPermission = currentSettings.nonSubspaceMemberPermission;
      if (nonMemberPermission !== "NONE" && newValue === "NONE") {
        console.warn("Subspace members should have at least READ permissions");
        return false;
      }
    }

    return true;
  });

  return (
    <div className="space-y-6 custom-scrollbar">
      {/* Permissions Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t("Permissions")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 flex items-center justify-between">
            <label htmlFor="subspace-type" className="text-sm font-medium">
              {t("Subspace Type")}
            </label>
            <SubspaceTypeSelector
              id="subspace-type"
              value={settings.subspace.type}
              onChange={handleTypeChange}
              disabled={!settings.permissions.canChangeType}
            />
          </div>

          {/* Role-based permissions display */}
          <div className="space-y-3">
            {/* Subspace Admin */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">{t("Subspace Admin")}</span>
              </div>
              <PermissionLevelSelector
                value={settings.subspace.subspaceAdminPermission}
                onChange={(value) => handlePermissionChange("subspaceAdminPermission", value)}
                disabled={true} // Always disabled as per requirements
              />
            </div>

            {/* Subspace Member */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">{t("Subspace Member")}</span>
              </div>
              <PermissionLevelSelector
                value={settings.subspace.subspaceMemberPermission}
                onChange={(value) => handlePermissionChange("subspaceMemberPermission", value)}
                disabled={!settings.permissions.canEditSettings}
              />
            </div>

            {/* Others outside the Subspace */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">{t("Others outside the Subspace")}</span>
              </div>
              <PermissionLevelSelector
                value={settings.subspace.nonSubspaceMemberPermission}
                onChange={(value) => handlePermissionChange("nonSubspaceMemberPermission", value)}
                disabled={!settings.permissions.canEditSettings || settings.subspace.type === "WORKSPACE_WIDE"}
              />
            </div>
          </div>

          {/* <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
            <span>{t("Learn about subspace permissions")}</span>
          </div> */}
        </CardContent>
      </Card>

      {/* Members Section */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t("Members")} ({searchQuery.trim() ? `${filteredMembers.length}/${settings.subspace.memberCount}` : settings.subspace.memberCount})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("Search members and member groups")}
                className="pl-10 pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleAddMember} disabled={settings.subspace.type === "WORKSPACE_WIDE"}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t("Add Member")}
                  </Button>
                </TooltipTrigger>
                {settings.subspace.type === "WORKSPACE_WIDE" && (
                  <TooltipContent>
                    <p>{t("Workspace-wide subspaces automatically include all workspace members")}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Members list */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="">{t("User")}</TableHead>
                  <TableHead className="">{t("Permission")}</TableHead>
                  <TableHead className="w-12 text-center">{t("Operations")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member) => {
                    const isCurrentUser = member.userId === userInfo?.id;

                    return (
                      <TableRow key={member.id}>
                        <TableCell className="">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={member.user.imageUrl || undefined} alt={member.user.displayName || member.user.email} />
                              <AvatarFallback>{displayUserName(member.user)[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="font-medium">
                              {displayUserName(member.user)}
                              {isCurrentUser && <span className="text-sm text-muted-foreground ml-2">({t("You")})</span>}
                            </div>
                            {/* <div className="text-sm text-muted-foreground">{member.user.email}</div> */}
                          </div>
                        </TableCell>
                        <TableCell className="">
                          <div className="flex">
                            <Select
                              value={member.role}
                              onValueChange={(value: SubspaceRole) => handleMemberRoleChange(member.id, value)}
                              disabled={isCurrentUser}
                            >
                              <SelectTrigger className="w-40 h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MEMBER">{t("Subspace Member")}</SelectItem>
                                <SelectItem value="ADMIN">{t("Subspace Admin")}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell className="">
                          <div className="flex justify-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isCurrentUser}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleRemoveMember(member.id)} className="text-destructive focus:text-destructive">
                                  <UserMinus className="h-4 w-4 mr-2" />
                                  {t("Remove user from subspace")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
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
        </CardContent>
      </Card>

      {/* FIXME: if you remove this, a wierd gap shows up at the top of the modal */}
      <div className="h-10"></div>
    </div>
  );
}
