import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import { starApi } from "@/apis/star";
import createEntitySlice from "./utils/entity-slice";
import useDocumentStore from "./document";

export interface StarEntity {
  id: string;
  docId: string | null;
  subspaceId: string | null;
  index: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: number;
}

interface State {
  isLoading: boolean;
  isLoaded: boolean;
}

interface Action {
  // API actions
  fetchList: () => Promise<StarEntity[]>;
  create: (params: { docId?: string; subspaceId?: string; index?: string }) => Promise<StarEntity>;
  remove: (id: string) => Promise<void>;
  update: (id: string, index: string) => Promise<void>;

  // Helper methods
  isStarred: (docId?: string, subspaceId?: string) => boolean;
  getStarByTarget: (docId?: string, subspaceId?: string) => StarEntity | undefined;
  needsUpdate: (id: string, updatedAt: Date) => boolean;
  handleStarUpdate: (starId: string, updatedAt?: string) => Promise<void>;
  handleStarRemove: (starId: string) => void;
}

const defaultState: State = {
  isLoading: false,
  isLoaded: false,
};

const starEntitySlice = createEntitySlice<StarEntity>();
export const starSelectors = starEntitySlice.getSelectors();

const useStarStore = create(
  subscribeWithSelector(
    devtools(
      createComputed((state: State & Action & ReturnType<typeof starEntitySlice.getState> & ReturnType<typeof starEntitySlice.getActions>) => ({
        orderedStars: starSelectors.selectAll(state).sort((a, b) => {
          if (!a.index || !b.index) return 0;
          return a.index < b.index ? -1 : 1;
        }),
      }))((set, get) => ({
        ...defaultState,
        ...starEntitySlice.getState(),
        ...starEntitySlice.getActions(set),

        // API Actions
        fetchList: async () => {
          set({ isLoading: true });
          try {
            const response = await starApi.findAll();
            const stars = response.data.stars.map((star) => ({
              ...star,
              createdAt: new Date(star.createdAt),
              updatedAt: new Date(star.updatedAt),
            }));

            // Fetch associated documents
            const documentStore = useDocumentStore.getState();
            for (const star of stars) {
              if (star.docId) {
                try {
                  await documentStore.fetchDetail(star.docId);
                } catch (error) {
                  console.warn(`Failed to fetch document ${star.docId}:`, error);
                }
              }
            }

            get().setAll(stars);
            set({ isLoaded: true });
            return stars;
          } catch (error) {
            console.error("Failed to fetch stars:", error);
            return [];
          } finally {
            set({ isLoading: false });
          }
        },

        create: async ({ docId, subspaceId, index }) => {
          try {
            const response = await starApi.create({ docId, subspaceId, index });
            const star: StarEntity = {
              id: response.data.id,
              docId: response.data.docId,
              subspaceId: response.data.subspaceId,
              index: response.data.index,
              createdAt: new Date(response.data.createdAt),
              updatedAt: new Date(response.data.updatedAt),
              userId: response.data.userId,
            };

            get().addOne(star);
            return star;
          } catch (error) {
            console.error("Failed to create star:", error);
            throw error;
          }
        },

        remove: async (id) => {
          try {
            await starApi.remove(id);
            get().removeOne(id);
          } catch (error) {
            console.error("Failed to remove star:", error);
            throw error;
          }
        },

        update: async (id, index) => {
          try {
            const response = await starApi.update(id, { index });
            get().updateOne({
              id,
              changes: {
                index: response.data.index,
                updatedAt: new Date(response.data.updatedAt),
              },
            });
          } catch (error) {
            console.error("Failed to move star:", error);
            throw error;
          }
        },

        // Helper methods
        isStarred: (docId, subspaceId) => {
          if (!docId && !subspaceId) return false;
          return get().getStarByTarget(docId, subspaceId) !== undefined;
        },

        getStarByTarget: (docId, subspaceId) => {
          if (!docId && !subspaceId) return undefined;
          return starSelectors.selectAll(get()).find((star) => (docId && star.docId === docId) || (subspaceId && star.subspaceId === subspaceId));
        },

        needsUpdate: (id, updatedAt) => {
          const existing = get().entities[id];
          if (!existing) return true;

          const existingDate = new Date(existing.updatedAt);
          return existingDate < updatedAt;
        },

        handleStarUpdate: async (starId, updatedAt) => {
          const existing = get().entities[starId];

          // Check if update is needed
          if (existing && updatedAt && new Date(existing.updatedAt).getTime() === new Date(updatedAt).getTime()) {
            return;
          }

          try {
            const response = await starApi.findOne(starId);
            get().updateOne({
              id: starId,
              changes: {
                ...response,
                createdAt: new Date(response.createdAt),
                updatedAt: new Date(response.updatedAt),
              },
            });
          } catch (error: any) {
            console.error(`Failed to update star ${starId}:`, error);
            if (error.status === 404 || error.status === 403) {
              get().removeOne(starId);
            }
          }
        },

        handleStarRemove: (starId) => {
          get().removeOne(starId);
        },
      })),
      {
        name: "starStore",
      },
    ),
  ),
);

export default useStarStore;
