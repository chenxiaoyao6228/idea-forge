import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Fragment, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Separator } from "@/components/ui/separator";
import { Emoji } from "emoji-picker-react";
import useUIStore from "@/stores/ui";
import useDocumentStore from "@/stores/document";

interface BreadcrumbItemData {
  id: string;
  title: string;
  icon: string;
}

export default function DocumentBreadcrumb() {
  const activeDocumentId = useUIStore((state) => state.activeDocumentId);

  const navigate = useNavigate();

  const getBreadcrumbItems = useCallback(() => {
    if (!activeDocumentId) return [];
    // getPathToDocumentInMyDocs returns NavigationNode[]
    const path = useDocumentStore.getState().getPathToDocumentInMyDocs(activeDocumentId);
    // Map NavigationNode to BreadcrumbItemData
    return path.map((node) => ({
      id: node.id,
      title: node.title,
      icon: node.icon || "1f4c4", // fallback to 📄 if no icon
    }));
  }, [activeDocumentId]);

  const breadcrumbItems = getBreadcrumbItems();

  const handleNavigate = (id: string) => {
    navigate(`/${id}`);
  };

  if (!breadcrumbItems.length) return null;

  const renderBreadcrumbItem = (item: BreadcrumbItemData) => {
    return (
      <div className="flex items-center gap-1">
        <Emoji unified={item.icon} size={20} />
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
              <Icon name="DotsHorizontal" className="h-4 w-4" />
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
