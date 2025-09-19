import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ShareWithMeLink } from "./components/share-with-me-link";
import { useSharedDocuments, useSharedWithMePagination, useFetchSharedDocuments, useLoadMoreSharedDocuments } from "@/stores/share-store";
import useUserStore from "@/stores/user";
import { SidebarGroup, SidebarGroupLabel } from "@/components/ui/sidebar";
import { ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";

const SKELETON_KEYS = ["skeleton-1", "skeleton-2", "skeleton-3"] as const;

export default function SharedWithMe() {
  const { t } = useTranslation();
  const { userInfo } = useUserStore();

  // Using focused single-purpose hooks + local UI state
  const sharedDocuments = useSharedDocuments();
  const { isLoading, isLoadingMore, hasNextPage, hasDocuments, isVisible } = useSharedWithMePagination();
  const fetchSharedDocuments = useFetchSharedDocuments();
  const loadMoreSharedDocuments = useLoadMoreSharedDocuments();

  // Local UI state (moved from global store)
  const [isOpen, setIsOpen] = useState(false);
  const [userToggled, setUserToggled] = useState(false);

  // Initial data fetch
  useEffect(() => {
    if (userInfo?.id) {
      fetchSharedDocuments.run();
    }
  }, [userInfo?.id]);

  console.log("sharedDocuments.length", sharedDocuments.length);

  // Handle manual toggle
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    setUserToggled(true);
  };

  // Auto-expand when new documents are added (if user hasn't manually toggled)
  useEffect(() => {
    if (sharedDocuments.length > 0 && !isOpen && !userToggled) {
      setIsOpen(true);
    }
  }, [sharedDocuments.length, isOpen, userToggled]);

  // Don't render if no documents and not loading (use computed state)
  if (!isVisible) {
    return null;
  }

  return (
    <SidebarGroup>
      <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
        <div className="flex items-center justify-between group/label">
          <CollapsibleTrigger className="flex items-center gap-1 hover:opacity-70">
            <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
            <SidebarGroupLabel>{t("Shared with me")}</SidebarGroupLabel>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          {/* FIXME: */}
          {/* <ScrollArea className="max-h-[300px]"> */}
          <ScrollArea className="max-h-[3000px]">
            <div className="space-y-1 p-2">
              {isLoading && !sharedDocuments.length
                ? SKELETON_KEYS.map((key) => <Skeleton key={key} className="h-8 w-full" />)
                : sharedDocuments.map((document) => <ShareWithMeLink key={document.id} document={document} />)}
              {hasNextPage && (
                <button
                  className="w-full py-2 text-xs text-center text-muted-foreground hover:underline"
                  onClick={() => loadMoreSharedDocuments.run()}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? t("Loading...") : t("Load more")}
                </button>
              )}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
