import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarGroup, SidebarGroupLabel } from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MyDocsLink } from "./components/my-doc-link";
import useDocumentStore from "@/stores/document";
import DropCursor from "./components/drop-cursor";
import { useDroppable } from "@dnd-kit/core";

export default function MyDocsArea() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { getMyDocsRootDocuments, fetchMyDocsChildren, createMyDocsDocument } = useDocumentStore();

  const handleCreateDocument = async () => {
    setIsCreating(true);
    try {
      await createMyDocsDocument({ title: "New Document" + Math.random().toString().substring(2, 5) });
    } catch (error) {
      console.error("Failed to create document:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const { isOver: isTopDropOver, setNodeRef: setTopDropRef } = useDroppable({  
    id: "mydocs-drop-top",  
    data: {  
      accept: ["document"],  
      dropType: "top",  
      subspaceId: null,  
      parentId: null,  
      index: null,  
    },  
  });  



  return (
    <SidebarGroup>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between group/label">
          <CollapsibleTrigger className="flex items-center gap-1 hover:opacity-70">
            <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
            <SidebarGroupLabel>{t("My Docs")}</SidebarGroupLabel>
          </CollapsibleTrigger>
          <div className="flex items-center gap-1 invisible group-hover/label:visible">
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 cursor-pointer hover:bg-accent/50 dark:hover:bg-accent/25"
              onClick={handleCreateDocument}
              disabled={isCreating}
            >
              <PlusIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CollapsibleContent>
          <div className="relative">  
            <div ref={setTopDropRef} className="h-[1px]">  
              <DropCursor isActiveDrop={isTopDropOver} innerRef={null} position="top" />  
            </div>  
            <MyDocsLink />  
          </div>  
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
