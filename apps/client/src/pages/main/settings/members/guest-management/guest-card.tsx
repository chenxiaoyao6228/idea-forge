import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, User, Calendar, MoreVertical, Trash2, UserPlus } from "lucide-react";
import { PermissionLevelSelector } from "@/components/ui/permission-level-selector";
import { GuestCollaboratorResponse } from "@idea/contracts";
import { useTimeFormat } from "@/hooks/use-time-format";

interface GuestCardProps {
  guest: GuestCollaboratorResponse;
  onUpdatePermission: (guestId: string, documentId: string, permission: string) => void;
  onRemoveDocumentAccess: (guestId: string, documentId: string, documentTitle: string) => void;
  onRemoveGuest: (guestId: string, guestName: string) => void;
  onPromoteGuest: (guestId: string, guestName: string) => void;
}

export const GuestCard = ({ guest, onUpdatePermission, onRemoveDocumentAccess, onRemoveGuest, onPromoteGuest }: GuestCardProps) => {
  const { t } = useTranslation();
  const { formatDate } = useTimeFormat();
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <User className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-medium text-black truncate">{guest.name || guest.email}</CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`text-xs`}>{t(guest.status)}</Badge>
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="h-6 w-6 p-0">
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onPromoteGuest(guest.id, guest.name || guest.email)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t("Promote to member")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onRemoveGuest(guest.id, guest.name || guest.email)} className="text-red-600 focus:text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("Remove from workspace")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Guest Info */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Calendar className="h-3 w-3" />
                <span>
                  {t("Expires")}: {formatDate(guest.expireAt)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <User className="h-3 w-3" />
                <span>
                  {t("Invited by")}: {guest.invitedBy.displayName || guest.invitedBy.email}
                </span>
              </div>
            </div>

            {/* Documents Access */}
            <div className="space-y-3">
              {guest.documents.length === 0 ? (
                <p className="text-xs text-gray-500 italic">{t("No document access")}</p>
              ) : (
                <div className="space-y-2">
                  {guest.documents.map((doc) => (
                    <div key={doc.documentId} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-black truncate">{doc.documentTitle}</p>
                        <p className="text-xs text-gray-500">
                          {t("Added")}: {formatDate(doc.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <PermissionLevelSelector
                          value={doc.permission}
                          onChange={(permission) => onUpdatePermission(guest.id, doc.documentId, permission)}
                          className="w-32"
                          showRemove={true}
                          onRemove={() => onRemoveDocumentAccess(guest.id, doc.documentId, doc.documentTitle)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
