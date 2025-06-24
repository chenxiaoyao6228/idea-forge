import { useState } from "react";
import { SubspaceTypeSchema } from "@idea/contracts";
import useSubSpaceStore from "@/stores/subspace";
import useWorkspaceStore from "@/stores/workspace";

export function useSubspaceOperations() {
  const [isCreating, setIsCreating] = useState(false);
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const fetchList = useSubSpaceStore((state) => state.fetchList);
  const ids = useSubSpaceStore((state) => state.ids);
  const create = useSubSpaceStore((state) => state.create);
  const subspaces = useSubSpaceStore((state) => state.allSubspaces);

  const handleSubspaceCreate = async () => {
    try {
      setIsCreating(true);
      await create({
        name: "New Subspace" + ids.length + 1,
        description: "New Subspace Description",
        avatar: "",
        type: SubspaceTypeSchema.Enum.PUBLIC,
        workspaceId: currentWorkspace?.id!,
      });
    } catch (error) {
      console.error("Failed to create subspace:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return {
    isCreating,
    subspaces,
    handleSubspaceCreate,
    fetchList,
  };
}
