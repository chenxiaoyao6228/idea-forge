import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ShareWithMeLink } from "./components/share-with-me-link";
import useDocumentStore, { DocumentEntity } from "@/stores/document";
import useUserStore from "@/stores/user";
import usePermissionStore from "@/stores/permission";
import { SidebarGroup, SidebarGroupLabel } from "@/components/ui/sidebar";
import { ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { permissionApi } from "@/apis/permission";

const SKELETON_KEYS = ["skeleton-1", "skeleton-2", "skeleton-3"] as const;

export default function SharedWithMe() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const { userInfo } = useUserStore();
  const { upsertMany } = useDocumentStore();
  const { setPermissions } = usePermissionStore();
  const [isLoading, setIsLoading] = useState(true);
  const [sharedDocuments, setSharedDocuments] = useState<DocumentEntity[]>([]);

  useEffect(() => {
    if (userInfo?.id) {
      permissionApi
        .getSharedWithMe({ page: 1, limit: 100 })
        .then((res) => {
          setSharedDocuments(res.data.documents);
          upsertMany(res.data.documents);
          setPermissions(res.data.permissions);
        })
        .catch(() => {
          toast.error(t("Failed to load shared documents"));
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [userInfo?.id, t, upsertMany, setPermissions]); // Remove setSharedDocuments and sharedDocuments from dependencies

  // Auto-expand if there are documents
  useEffect(() => {
    if (sharedDocuments.length > 0) {
      setIsOpen(true);
    }
  }, [sharedDocuments]);

  const hasDocuments = sharedDocuments.length > 0;

  if (!hasDocuments || isLoading) {
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
              {isLoading ? (
                SKELETON_KEYS.map((key) => <Skeleton key={key} className="h-8 w-full" />)
              ) : !hasDocuments ? (
                <div className="text-sm text-muted-foreground p-2 text-center">{t("No shared documents yet")}</div>
              ) : (
                sharedDocuments.map((document) => <ShareWithMeLink key={document.id} document={document} />)
              )}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
