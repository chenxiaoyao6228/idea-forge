import { SidebarGroup, SidebarGroupLabel, SidebarMenu } from "@/components/ui/sidebar";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { subspaceApi } from "@/apis/subspace";
import { SubspaceComp } from "./subspace";
import { Button } from "@/components/ui/button";
import { Layers, PlusIcon, ChevronRight } from "lucide-react";
import { SubspaceType } from "contracts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import useSubSpaceStore from "@/stores/subspace-store";
import useWorkspaceStore from "@/stores/workspace-store";

export default function Subspaces() {
  const { t } = useTranslation();
  const currentWorkspace = useWorkspaceStore.use.currentWorkspace();
  const subspaces = useSubSpaceStore.use.subspaces();
  const setSubspaces = useSubSpaceStore.use.setSubspaces();
  const [isCreating, setIsCreating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchSubspaces = async () => {
      try {
        const response = await subspaceApi.getSubspaces();
        setSubspaces(response);
      } catch (error) {
        console.error("Failed to fetch subspaces:", error);
      }
    };

    fetchSubspaces();
  }, [setSubspaces]);

  const handleViewAllSubspaces = () => {
    // TODO: Implement view all subspaces
  };

  const handleSubspaceCreate = async () => {
    try {
      setIsCreating(true);
      const response = await subspaceApi.createSubspace({
        name: "New Subspace" + (subspaces.length + 1),
        description: "New Subspace Description",
        avatar: "",
        type: SubspaceType.PUBLIC,
        workspaceId: currentWorkspace?.id!,
      });
      setSubspaces([...subspaces, response]);
    } catch (error) {
      console.error("Failed to create subspace:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SidebarGroup>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between group/label">
          <CollapsibleTrigger className="flex items-center gap-1 hover:opacity-70">
            <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
            <SidebarGroupLabel>{t("Subspaces")}</SidebarGroupLabel>
          </CollapsibleTrigger>
          <div className="flex items-center gap-1 invisible group-hover/label:visible">
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 cursor-pointer hover:bg-accent/50 dark:hover:bg-accent/25"
              onClick={handleSubspaceCreate}
              disabled={isCreating}
            >
              <PlusIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CollapsibleContent>
          <SidebarMenu>{subspaces.length && subspaces.map((subspace) => <SubspaceComp key={subspace.id} subspace={subspace} />)}</SidebarMenu>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
