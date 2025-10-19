import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@idea/ui/shadcn/ui/breadcrumb";
import { Fragment, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@idea/ui/shadcn/ui/dropdown-menu";
import { Separator } from "@idea/ui/shadcn/ui/separator";
import { MoreHorizontal } from "lucide-react";
import { Emoji } from "emoji-picker-react";
import useSubSpaceStore, { useGetPathToDocument, usePersonalSubspace } from "@/stores/subspace-store";
import { useFindNavigationNodeInSharedDocuments } from "@/stores/share-store";
import { useCurrentDocumentFromStore, useCurrentDocumentId } from "@/stores/document-store";

interface BreadcrumbItemData {
  id: string;
  title: string;
  icon?: string;
}

export default function DocumentBreadcrumb() {
  const activeDocumentId = useCurrentDocumentId();
  const findNavigationNodeInSharedDocuments = useFindNavigationNodeInSharedDocuments();
  const getPathToDocument = useGetPathToDocument();
  const personalSubspace = usePersonalSubspace();
  const activeDocument = useCurrentDocumentFromStore();

  const navigate = useNavigate();

  // ✅ Use useMemo for computed breadcrumb items with comprehensive path finding
  const breadcrumbItems = useMemo(() => {
    if (!activeDocumentId) return [];

    const subspaceStore = useSubSpaceStore.getState();

    let path: any[] = [];

    // 1. Check personal subspace first
    if (personalSubspace) {
      path = getPathToDocument(personalSubspace.id, activeDocumentId);
      if (path.length > 0) {
        return path.map((node) => ({
          id: node.id,
          title: node.title,
          icon: node.icon ?? undefined,
        })) as BreadcrumbItemData[];
      }
    }

    // 2. Check shared-with-me documents
    const sharedNode = findNavigationNodeInSharedDocuments(activeDocumentId);
    if (sharedNode) {
      return [
        {
          id: sharedNode.id,
          title: sharedNode.title,
          icon: undefined,
        },
      ] as BreadcrumbItemData[];
    }

    // 3. Check all other subspaces
    const allSubspaces = subspaceStore.subspaces;
    for (const subspace of Object.values(allSubspaces)) {
      if (subspace.id === personalSubspace?.id) continue; // Skip personal subspace (already checked)

      path = getPathToDocument(subspace.id, activeDocumentId);
      if (path.length > 0) {
        return path.map((node) => ({
          id: node.id,
          title: node.title,
          icon: node.icon ?? undefined,
        })) as BreadcrumbItemData[];
      }
    }

    return [];
  }, [activeDocumentId, activeDocument?.title, getPathToDocument, findNavigationNodeInSharedDocuments, personalSubspace]);

  const handleNavigate = (id: string) => {
    navigate(`/${id}`);
  };

  if (!breadcrumbItems.length) return null;

  const renderBreadcrumbItem = (item: BreadcrumbItemData) => {
    return (
      <div className="flex items-center gap-1">
        {item.icon ? <Emoji unified={item.icon} size={20} /> : null}
        {item.title}
      </div>
    );
  };

  if (breadcrumbItems.length > 3) {
    return (
      <>
        <Separator orientation="vertical" className="mr-2 h-4" />
        {/* First item */}
        <BreadcrumbItem>
          <BreadcrumbLink onClick={() => handleNavigate(breadcrumbItems[0].id)} className="cursor-pointer">
            {renderBreadcrumbItem(breadcrumbItems[0])}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />

        {/* Collapsed middle items */}
        <BreadcrumbItem>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {breadcrumbItems.slice(1, -1).map((item) => (
                <DropdownMenuItem key={item.id} onClick={() => handleNavigate(item.id)}>
                  {renderBreadcrumbItem(item)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </BreadcrumbItem>
        <BreadcrumbSeparator />

        {/* Last item */}
        <BreadcrumbItem>
          <BreadcrumbPage>{renderBreadcrumbItem(breadcrumbItems[breadcrumbItems.length - 1])}</BreadcrumbPage>
        </BreadcrumbItem>
      </>
    );
  }

  // Show full path for short paths
  return (
    <>
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbItems.map((item, index, array) => (
            <Fragment key={item.id}>
              <BreadcrumbItem>
                {index === array.length - 1 ? (
                  <BreadcrumbPage>{renderBreadcrumbItem(item)}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink onClick={() => handleNavigate(item.id)} className="cursor-pointer">
                    {renderBreadcrumbItem(item)}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {index < array.length - 1 && <BreadcrumbSeparator />}
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </>
  );
}
