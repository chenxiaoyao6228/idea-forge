import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import { starApi } from "@/apis/star";
import createEntitySlice, { EntityState, EntityActions, EntitySelectors } from "./utils/entity-slice";
import useDocumentStore from "./document";

const STORE_NAME = "starStore";

export interface StarEntity {
  id: string;
  docId: string | null;
  subspaceId: string | null;
  index: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

interface State {
  isLoading: boolean;
  isLoaded: boolean;
}

interface Action {
  // API actions
  fetchList: () => Promise<StarEntity[]>;
  create: (params: {
    docId?: string;
    subspaceId: string | null;
    index?: string;
  }) => Promise<StarEntity>;
  remove: (id: string) => Promise<void>;
  update: (id: string, index: string) => Promise<void>;

  // Helper methods
  isStarred: (docId?: string, subspaceId?: string | null) => boolean;
  getStarByTarget: (docId?: string, subspaceId?: string | null) => StarEntity | undefined;
  needsUpdate: (id: string, updatedAt: Date) => boolean;
  handleStarUpdate: (starId: string, updatedAt?: string) => Promise<void>;
  handleStarRemove: (starId: string) => void;
}

const defaultState: State = {
  isLoading: false,
  isLoaded: false,
};

const { initialState, selectors, createActions } = createEntitySlice<StarEntity>();

export const starEntitySelectors = selectors;

type StoreState = State & Action & EntityState<StarEntity> & EntityActions<StarEntity>;
const useStarStore = create<StoreState>()(
  subscribeWithSelector(
    devtools(
      createComputed((state: StoreState) => ({
        orderedStars: selectors.selectAll(state).sort((a, b) => {
          if (!a.index || !b.index) return 0;
          return a.index < b.index ? -1 : 1;
        }),
      }))((set, get) => {
        const store: StoreState = {
          ...defaultState,
          ...initialState,
          ...createActions(set),

          // API Actions
          fetchList: async () => {
            if (get().isLoading) return [];
            set({ isLoading: true });
            try {
              const response = await starApi.findAll();
              const stars = response.data.stars.map((star) => ({
                ...star,
                createdAt: new Date(star.createdAt),
                updatedAt: new Date(star.updatedAt),
              }));

              const docIds = stars.filter((star) => star.docId).map((star) => star.docId!);
              if (docIds.length > 0) {
                const documentStore = useDocumentStore.getState();
                await Promise.all(
                  docIds.map((docId) =>
                    documentStore.fetchDetail(docId).catch((error) => {
                      console.warn(`Failed to fetch document ${docId}:`, error);
                    }),
                  ),
                );
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

          create: async (params) => {
            try {
              const response = await starApi.create(params);
              const star: StarEntity = {
                id: response.data.id,
                docId: response.data.docId,
                subspaceId: response.data.subspaceId,
                index: response.data.index,
                userId: response.data.userId,
                createdAt: new Date(response.data.createdAt),
                updatedAt: new Date(response.data.updatedAt),
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
            return selectors.selectAll(get()).find((star) => (docId && star.docId === docId) || (subspaceId && star.subspaceId === subspaceId));
          },

          needsUpdate: (id, updatedAt) => {
            const existing = selectors.selectById(get(), id);
            if (!existing) return true;

            const existingDate = new Date(existing.updatedAt);
            return existingDate < updatedAt;
          },

          handleStarUpdate: async (starId, updatedAt) => {
            const existing = selectors.selectById(get(), starId);

            if (existing && updatedAt && new Date(existing.updatedAt).getTime() === new Date(updatedAt).getTime()) {
              return;
            }

            try {
              const response = await starApi.findOne(starId);
              get().updateOne({
                id: starId,
                changes: {
                  ...response,
                  userId: response.userId.toString(),
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
        };

        return store;
      }),
      {
        name: STORE_NAME,
      },
    ),
  ),
);

export default useStarStore;
