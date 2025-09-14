import { create } from "zustand";
import { useMemo } from "react";
import { toast } from "sonner";
import { starApi } from "@/apis/star";
import useRequest from "@ahooksjs/use-request";
import { useRefCallback } from "@/hooks/use-ref-callback";
import useSubSpaceStore from "./subspace";
import useSharedWithMeStore from "./shared-with-me";
import useWorkspaceStore from "./workspace";
import { NavigationNode, NavigationNodeType, CreateStarDto } from "@idea/contracts";

export interface StarEntity {
  id: string;
  docId: string; // Only documents can be starred, so this is required
  index: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

const useStarStore = create<{
  stars: StarEntity[];
  setStars: (stars: StarEntity[]) => void;
  addStar: (star: StarEntity) => void;
  updateStar: (id: string, changes: Partial<StarEntity>) => void;
  removeStar: (id: string) => void;
  upsertStar: (star: StarEntity) => void;
}>((set) => ({
  stars: [],

  setStars: (stars) => set({ stars }),

  addStar: (star) =>
    set((state) => ({
      stars: [...state.stars, star],
    })),

  updateStar: (id, changes) =>
    set((state) => ({
      stars: state.stars.map((star) => (star.id === id ? { ...star, ...changes } : star)),
    })),

  removeStar: (id) =>
    set((state) => ({
      stars: state.stars.filter((star) => star.id !== id),
    })),

  upsertStar: (star) =>
    set((state) => {
      const existingIndex = state.stars.findIndex((s) => s.id === star.id);
      if (existingIndex >= 0) {
        // Update existing
        const newStars = [...state.stars];
        newStars[existingIndex] = star;
        return { stars: newStars };
      }
      // Add new
      return { stars: [...state.stars, star] };
    }),
}));

// ✅ Consolidated data access and operations hook
export const useStars = () => {
  const starStore = useStarStore();
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);

  const stars = starStore.stars;

  const orderedStars = useMemo(
    () =>
      stars.sort((a, b) => {
        if (!a.index || !b.index) return 0;
        return a.index < b.index ? -1 : 1;
      }),
    [stars],
  );

  // Note: starsBySubspace removed since we only star documents now

  const checkStarred = useRefCallback((docId?: string) => {
    if (!docId) return false;
    return stars.some((star) => star.docId === docId);
  });

  const findStar = useRefCallback((docId?: string) => {
    if (!docId) return undefined;
    return stars.find((star) => star.docId === docId);
  });

  // ✅ Fetch operation
  const fetchStars = useRequest(
    async () => {
      if (!currentWorkspace) {
        throw new Error("No current workspace found");
      }
      const response = await starApi.findAll(currentWorkspace.id);
      // All stars are now documents only - filter out any without docId and ensure docId is string
      const stars = response.data.stars
        .filter((star) => star.docId) // Only include stars with docId
        .map((star) => ({
          ...star,
          docId: star.docId!, // We know it exists due to filter
          createdAt: new Date(star.createdAt),
          updatedAt: new Date(star.updatedAt),
        }));

      return stars;
    },
    {
      onSuccess: (stars) => starStore.setStars(stars),
      onError: (error) =>
        toast.error("Failed to fetch stars", {
          description: error.message,
        }),
      ready: !!currentWorkspace,
      manual: true,
    },
  );

  // ✅ Create operation
  const createStar = useRequest(
    async (params: CreateStarDto) => {
      // Only allow starring documents
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

      // Note: Document details will be fetched on-demand when needed
      // This prevents unnecessary loading states in the main document view

      return star;
    },
    {
      onSuccess: (star) => {
        starStore.addStar(star);
      },
      onError: (error) =>
        toast.error("Failed to star document", {
          description: error.message,
        }),
      manual: true,
    },
  );

  // ✅ Delete operation
  const deleteStar = useRequest(
    async (id: string) => {
      await starApi.remove(id);
      return id;
    },
    {
      onSuccess: (id) => {
        starStore.removeStar(id);
      },
      onError: (error) =>
        toast.error("Failed to unstar document", {
          description: error.message,
        }),
      manual: true,
    },
  );

  // ✅ Star toggle functionality
  const toggleStar = useRefCallback(async (docId?: string) => {
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

  // ✅ Navigation logic for starred documents - using useRefCallback for stability
  const getNavigationNodeForStar = useRefCallback((star: StarEntity): NavigationNode | null => {
    // Only handle starred documents
    if (!star.docId) return null;

    const subspaceStore = useSubSpaceStore.getState();
    const sharedWithMeStore = useSharedWithMeStore.getState();

    // 1. Check personal subspace
    const personalNode = subspaceStore.findNavigationNodeInPersonalSubspace(star.docId);
    if (personalNode) return personalNode;

    // 2. Check shared-with-me documents
    const sharedNode = sharedWithMeStore.findNavigationNodeInSharedDocuments(star.docId);
    if (sharedNode) return sharedNode;

    // 3. Check all subspaces
    const allSubspaces = subspaceStore.entities;
    for (const subspace of Object.values(allSubspaces)) {
      const node = subspaceStore.findNavigationNodeInSubspace(subspace.id, star.docId);
      if (node) return node;
    }

    return null;
  });

  return {
    ...starStore,
    orderedStars,
    checkStarred,
    findStar,
    // Operations
    fetchStars,
    createStar,
    deleteStar,
    toggleStar,
    getNavigationNodeForStar,
    // Loading states
    isToggling: createStar.loading || deleteStar.loading,
  };
};

export default useStarStore;
