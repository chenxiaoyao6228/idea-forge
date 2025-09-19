import { create } from "zustand";
import { useMemo } from "react";
import { toast } from "sonner";
import { starApi } from "@/apis/star";
import useRequest from "@ahooksjs/use-request";
import { useRefCallback } from "@/hooks/use-ref-callback";
import useSubSpaceStore from "./subspace";
import { useFindNavigationNodeInSharedDocuments } from "./share-store";
import useWorkspaceStore from "./workspace";
import { NavigationNode, CreateStarDto } from "@idea/contracts";
import { orderBy } from "lodash-es";

export interface StarEntity {
  id: string;
  docId: string; // Only documents can be starred, so this is required
  index: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

// Minimal store - only state
const useStarStore = create<{
  stars: StarEntity[];
}>((set) => ({
  stars: [],
}));

// Basic data access
export const useStars = () => {
  return useStarStore((state) => state.stars);
};

// Computed values
export const useOrderedStars = () => {
  const stars = useStarStore((state) => state.stars);
  return useMemo(() => orderBy(stars, ["index"], ["asc"]), [stars]);
};

// Fetch operation
export const useFetchStars = () => {
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);

  return useRequest(
    async () => {
      try {
        if (!currentWorkspace) {
          throw new Error("No current workspace found");
        }
        const response = await starApi.findAll(currentWorkspace.id);
        const newStars = response.data.stars
          .filter((star) => star.docId)
          .map((star) => ({
            ...star,
            docId: star.docId!,
            createdAt: new Date(star.createdAt),
            updatedAt: new Date(star.updatedAt),
          }));

        useStarStore.setState({ stars: newStars });
        return newStars;
      } catch (error: any) {
        console.error("Failed to fetch stars:", error);
        toast.error("Failed to fetch stars", {
          description: error.message,
        });
        throw error;
      }
    },
    {
      ready: !!currentWorkspace,
      manual: true,
    },
  );
};

// Create operation
export const useCreateStar = () => {
  return useRequest(
    async (params: CreateStarDto) => {
      try {
        if (!params.docId) {
          throw new Error("Only documents can be starred");
        }
        const response = await starApi.create(params);
        const star: StarEntity = {
          id: response.data.id,
          docId: response.data.docId!,
          index: response.data.index,
          userId: response.data.userId,
          createdAt: new Date(response.data.createdAt),
          updatedAt: new Date(response.data.updatedAt),
        };

        useStarStore.setState((state) => ({
          stars: [...state.stars, star],
        }));
        return star;
      } catch (error: any) {
        console.error("Failed to star document:", error);
        toast.error("Failed to star document", {
          description: error.message,
        });
        throw error;
      }
    },
    {
      manual: true,
    },
  );
};

// Delete operation
export const useDeleteStar = () => {
  return useRequest(
    async (id: string) => {
      try {
        await starApi.remove(id);
        useStarStore.setState((state) => ({
          stars: state.stars.filter((star) => star.id !== id),
        }));
        return id;
      } catch (error: any) {
        console.error("Failed to unstar document:", error);
        toast.error("Failed to unstar document", {
          description: error.message,
        });
        throw error;
      }
    },
    {
      manual: true,
    },
  );
};

// Check if document is starred
export const useCheckStarred = () => {
  const stars = useStarStore((state) => state.stars);

  return useRefCallback((docId?: string) => {
    if (!docId) return false;
    return stars.some((star) => star.docId === docId);
  });
};

// Find star by document ID
export const useFindStar = () => {
  const stars = useStarStore((state) => state.stars);

  return useRefCallback((docId?: string) => {
    if (!docId) return undefined;
    return stars.find((star) => star.docId === docId);
  });
};

// Toggle star status
export const useToggleStar = () => {
  const checkStarred = useCheckStarred();
  const findStar = useFindStar();
  const createStar = useCreateStar();
  const deleteStar = useDeleteStar();

  return useRefCallback(async (docId?: string) => {
    if (!docId) {
      throw new Error("Document ID is required to star/unstar");
    }

    const starred = checkStarred(docId);
    if (starred) {
      const star = findStar(docId);
      if (star) await deleteStar.run(star.id);
    } else {
      await createStar.run({ docId });
    }
  });
};

// Navigation logic
export const useStarNavigation = () => {
  const findNavigationNodeInSharedDocuments = useFindNavigationNodeInSharedDocuments();

  const getNavigationNodeForStar = useRefCallback((star: StarEntity): NavigationNode | null => {
    if (!star.docId) return null;

    const subspaceStore = useSubSpaceStore.getState();

    // Check personal subspace
    const personalNode = subspaceStore.findNavigationNodeInPersonalSubspace(star.docId);
    if (personalNode) return personalNode;

    // Check shared-with-me documents
    const sharedNode = findNavigationNodeInSharedDocuments(star.docId);
    if (sharedNode) return sharedNode;

    // Check all subspaces
    const allSubspaces = subspaceStore.entities;
    for (const subspace of Object.values(allSubspaces)) {
      const node = subspaceStore.findNavigationNodeInSubspace(subspace.id, star.docId);
      if (node) return node;
    }

    return null;
  });

  return { getNavigationNodeForStar };
};

export default useStarStore;
