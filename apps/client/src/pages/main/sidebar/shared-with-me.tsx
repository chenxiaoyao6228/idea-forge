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
  const { upsertMany, fetchDetail, fetchChildren } = useDocumentStore();
  const { setPermissions } = usePermissionStore();
  const [isLoading, setIsLoading] = useState(true);
  const [sharedDocuments, setSharedDocuments] = useState<DocumentEntity[]>([]);
  const [loadingParents, setLoadingParents] = useState<Set<string>>(new Set());

  // Load shared documents with parent hierarchy resolution
  useEffect(() => {
    if (userInfo?.id) {
      loadSharedDocumentsWithParents();
    }
  }, [userInfo?.id]);

  /**
   * Load shared documents and resolve their parent hierarchy
   * This ensures we have complete document trees for navigation
   */
  const loadSharedDocumentsWithParents = async () => {
    try {
      setIsLoading(true);

      // Get initial shared documents
      const res = (await permissionApi.getSharedWithMe({ page: 1, limit: 100 })) as any;
      const documents = res.data.documents;

      // Store documents and permissions
      upsertMany(documents);
      setPermissions(res.permissions);

      // Resolve parent hierarchy for each document
      const documentsWithParents = await resolveParentHierarchy(documents);

      // Filter to show only root-level shared documents
      const rootDocuments = documentsWithParents.filter((doc) => !doc.parentId || !documentsWithParents.some((parent) => parent.id === doc.parentId));

      setSharedDocuments(rootDocuments);
    } catch (error) {
      toast.error(t("Failed to load shared documents"));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Resolve parent hierarchy for shared documents
   * Loads parent documents up to the root to build complete navigation trees
   */
  const resolveParentHierarchy = async (documents: DocumentEntity[]): Promise<DocumentEntity[]> => {
    const allDocuments = new Map<string, DocumentEntity>();
    const toLoad = new Set<string>();

    // Add initial documents
    documents.forEach((doc) => {
      allDocuments.set(doc.id, doc);
      if (doc.parentId) {
        toLoad.add(doc.parentId);
      }
    });

    // Load parent documents recursively
    while (toLoad.size > 0) {
      const parentIds = Array.from(toLoad);
      toLoad.clear();

      setLoadingParents(new Set(parentIds));

      try {
        const parentPromises = parentIds.map(async (parentId) => {
          if (!allDocuments.has(parentId)) {
            const result = await fetchDetail(parentId);
            if (result?.data?.document) {
              const parent = result.data.document;
              allDocuments.set(parent.id, parent);

              // Check if this parent has a parent too
              if (parent.parentId && !allDocuments.has(parent.parentId)) {
                toLoad.add(parent.parentId);
              }

              return parent;
            }
          }
          return null;
        });

        await Promise.all(parentPromises);
      } catch (error) {
        console.warn("Failed to load some parent documents:", error);
        break; // Stop loading parents on error
      } finally {
        setLoadingParents(new Set());
      }
    }

    return Array.from(allDocuments.values());
  };

  // Auto-expand if there are documents
  useEffect(() => {
    if (sharedDocuments.length > 0) {
      setIsOpen(true);
    }
  }, [sharedDocuments]);

  const hasDocuments = sharedDocuments.length > 0;

  if (!hasDocuments && !isLoading) {
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
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-1 p-2">
              {isLoading
                ? SKELETON_KEYS.map((key) => <Skeleton key={key} className="h-8 w-full" />)
                : sharedDocuments.map((document) => <ShareWithMeLink key={document.id} document={document} loadingParents={loadingParents} />)}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
