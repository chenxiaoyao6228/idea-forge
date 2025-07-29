import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ShareWithMeLink } from "./components/share-with-me-link";
import useDocumentStore from "@/stores/document";
import useUserStore from "@/stores/user";
import usePermissionStore from "@/stores/permission";
import { SidebarGroup, SidebarGroupLabel } from "@/components/ui/sidebar";
import { ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { documentApi } from "@/apis/document";
import useWorkspaceStore from "@/stores/workspace";

const SKELETON_KEYS = ["skeleton-1", "skeleton-2", "skeleton-3"] as const;
const PAGE_SIZE = 20;

export default function SharedWithMe() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [userToggled, setUserToggled] = useState(false);
  const { userInfo } = useUserStore();
  const upsertMany = useDocumentStore((state) => state.upsertMany);
  const setPermissions = usePermissionStore((state) => state.setPermissions);
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useInfiniteQuery({
    queryKey: ["shared-with-me", userInfo?.id],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await documentApi.getSharedWithMe({
        page: pageParam,
        limit: PAGE_SIZE,
        workspaceId: currentWorkspace?.id,
      });
      return { ...res, page: pageParam };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      if (!pagination) return undefined;
      const { page, limit, total } = pagination;
      const loaded = page * limit;
      return loaded < total ? page + 1 : undefined;
    },
    enabled: !!userInfo?.id,
    retry: false,
  });

  // Flatten all loaded documents and permissions
  const sharedDocuments = data?.pages.flatMap((page) => page.data.documents) || [];
  const allPermissions =
    data?.pages.reduce(
      (acc, page) => {
        Object.assign(acc, page.permissions);
        return acc;
      },
      {} as Record<string, any>,
    ) || {};

  // Store documents and permissions in zustand
  const lastSynced = useRef<{ docIds: string[]; permKeys: string[] }>({ docIds: [], permKeys: [] });
  useEffect(() => {
    const docIds = sharedDocuments.map((d) => d.id).sort();
    const permKeys = Object.keys(allPermissions).sort();

    // Only update if data actually changed
    const isSameDocs = docIds.join(",") === lastSynced.current.docIds.join(",");
    const isSamePerms = permKeys.join(",") === lastSynced.current.permKeys.join(",");

    if (sharedDocuments.length > 0 && (!isSameDocs || !isSamePerms)) {
      upsertMany(sharedDocuments);
      setPermissions(allPermissions);
      lastSynced.current = { docIds, permKeys };
    }
  }, [sharedDocuments, allPermissions, upsertMany, setPermissions]);

  // 用户手动操作时设置 userToggled
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    setUserToggled(true);
  };

  // 只在未手动操作时自动展开
  useEffect(() => {
    if (sharedDocuments.length > 0 && !isOpen && !userToggled) {
      setIsOpen(true);
    }
  }, [sharedDocuments, isOpen, userToggled]);

  if (isError) {
    toast.error(t("Failed to load shared documents"));
    return null;
  }

  if (!sharedDocuments.length && !isLoading) {
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
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-1 p-2">
              {isLoading && !sharedDocuments.length
                ? SKELETON_KEYS.map((key) => <Skeleton key={key} className="h-8 w-full" />)
                : sharedDocuments.map((document) => <ShareWithMeLink key={document.id} document={document} />)}
              {hasNextPage && (
                <button
                  className="w-full py-2 text-xs text-center text-muted-foreground hover:underline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? t("Loading...") : t("Load more")}
                </button>
              )}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
