import { useState } from "react";
import { Card, CardContent, CardHeader } from '@idea/ui/shadcn/ui/card';
import { Button } from '@idea/ui/shadcn/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@idea/ui/shadcn/ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@idea/ui/shadcn/ui/dropdown-menu';
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, MoreVertical, X, Users, UserPlus, Edit2, Trash2 } from "lucide-react";
import { useRemoveUserFromGroup } from "@/stores/group-store";
import { showConfirmModal } from '@/components/ui/confirm-modal';
import type { Group } from "./types";

interface GroupCardProps {
  group: Group;
  expanded: boolean;
  onToggleExpand: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDisband: (id: string) => void;
  onManageMembers: (id: string) => void;
  onRemoveMember: (groupId: string, userId: string) => Promise<void>;
}

export const GroupCard = ({ group, expanded, onToggleExpand, onRename, onDisband, onManageMembers, onRemoveMember }: GroupCardProps) => {
  const { t } = useTranslation();
  const { run: removeUserFromGroup } = useRemoveUserFromGroup();

  const handleRemoveMember = (groupId: string, userId: string) => {
    showConfirmModal({
      title: t("Remove Member"),
      description: t("Are you sure you want to remove this member from the group?"),
      confirmVariant: "destructive",
      onConfirm: async () => {
        try {
          await onRemoveMember(groupId, userId);
          return true;
        } catch (error) {
          return false;
        }
      },
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-black text-balance">{group.name}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Users className="h-4 w-4" />
              <span>
                {group.members?.length || 0} member{(group.members?.length || 0) !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onRename(group.id, group.name)}>
                <Edit2 className="h-4 w-4 mr-2" />
                {t("Rename")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDisband(group.id)} className="text-red-600 focus:text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                {t("Disband")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Expandable member list */}
        <div>
          <button
            onClick={() => onToggleExpand(group.id)}
            className="flex items-center gap-2 text-sm font-medium hover:text-gray-600 transition-colors w-full text-left"
            aria-expanded={expanded}
            aria-label={`${expanded ? "Collapse" : "Expand"} member list`}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {t("Members")}
          </button>

          {expanded && (
            <div className="mt-2 space-y-2 pl-6">
              {group.members && group.members.length > 0 ? (
                group.members.map((member: any) => (
                  <div key={member.userId} className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.user?.imageUrl || undefined} alt={member.user?.displayName || member.userId} />
                        <AvatarFallback className="text-xs bg-gray-100 text-black">{member.user?.displayName?.[0] || member.userId?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-black">{member.user?.displayName || member.user?.email || member.userId}</p>
                        <p className="text-xs text-muted-foreground">{member.user?.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveMember(group.id, member.userId)}
                      aria-label={`Remove ${member.user?.displayName || member.userId} from group`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No members yet</p>
              )}
            </div>
          )}
        </div>

        {/* Manage Members button */}
        <Button variant="outline" className="w-full bg-transparent border-gray-300 text-black hover:bg-gray-50" onClick={() => onManageMembers(group.id)}>
          <UserPlus className="h-4 w-4 mr-2" />
          {t("Manage Members")}
        </Button>
      </CardContent>
    </Card>
  );
};
