import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ShareWithMeLink } from "./components/share-with-me-link";
import useDocUserPermissionStore from "@/stores/user-permission";
import useDocGroupPermissionStore from "@/stores/group-permission";
import useDocumentStore from "@/stores/document";
import useUserStore from "@/stores/user";
import { UserPermissionResponse } from "contracts";
import { SidebarGroup, SidebarGroupLabel } from "@/components/ui/sidebar";
import { ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";

const SKELETON_KEYS = ["skeleton-1", "skeleton-2", "skeleton-3"] as const;

export default function SharedWithMe() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const { userInfo } = useUserStore();
  const { list: listUserPermissions, currentUserPermissions, isFetching: isUserPermissionsFetching } = useDocUserPermissionStore();
  const { list: listGroupPermissions, getByDocumentId: getGroupPermissionsByDocumentId, isFetching: isGroupPermissionsFetching } = useDocGroupPermissionStore();
  const { entities: documents } = useDocumentStore();

  useEffect(() => {
    if (userInfo?.id) {
      Promise.all([
        // TODO: decide whether we should pass the whole query
        listUserPermissions(userInfo?.id, { force: true }),
        listGroupPermissions(
          {
            limit: 100,
            page: 1,
            sortBy: "createdAt",
          },
          { force: true },
        ),
      ]).catch((error) => {
        console.error("Failed to load shared documents:", error);
        toast.error(t("Failed to load shared documents"));
      });
    }
  }, [userInfo?.id, listUserPermissions, listGroupPermissions, t]);

  // Auto-expand if there are permissions
  useEffect(() => {
    if (currentUserPermissions.length > 0) {
      setIsOpen(true);
    }
  }, [currentUserPermissions.length]);

  const isFetching = isUserPermissionsFetching || isGroupPermissionsFetching;
  const hasPermissions = currentUserPermissions.length > 0;

  if (!hasPermissions && !isFetching) {
    return null;
  }

  return (
    <SidebarGroup>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between group/label">
          <CollapsibleTrigger className="flex items-center gap-1 hover:opacity-70">
            <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
            <SidebarGroupLabel>{t("Shared with me")}</SidebarGroupLabel>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <ScrollArea className="max-h-[300px] min-h-[100px]">
            <div className="space-y-1 p-2">
              {isFetching ? (
                SKELETON_KEYS.map((key) => <Skeleton key={key} className="h-8 w-full" />)
              ) : currentUserPermissions.length === 0 ? (
                <div className="text-sm text-muted-foreground p-2 text-center">{t("No shared documents yet")}</div>
              ) : (
                currentUserPermissions.map((permission) => {
                  const document = permission.documentId ? documents[permission.documentId] : undefined;
                  // FIXME:
                  // const groupPermissions = getGroupPermissionsByDocumentId(permission.documentId || "");
                  return <ShareWithMeLink key={permission.id} permission={permission} document={document} />;
                })
              )}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
