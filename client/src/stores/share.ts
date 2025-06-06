import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import { shareApi } from "@/apis/share";
import createEntitySlice, { EntityState, EntityActions } from "./utils/entity-slice";
import useDocumentStore from "./document";
import { permission } from "contracts";

type Permission = (typeof permission)[number];

interface FetchOptions {
  force?: boolean;
  prefetch?: boolean;
}

export interface ShareEntity {
  id: string;
  documentId: string;
  document: {
    id: string;
    title: string;
    workspace: {
      id: string;
      name: string;
      description: string | null;
      avatar: string | null;
    };
    subspace: {
      id: string;
      name: string;
      description: string | null;
      avatar: string | null;
    } | null;
  };
  author: {
    id: number;
    email: string;
    displayName: string | null;
  };
  sharedTo: {
    id: number;
    email: string;
    displayName: string | null;
  };
  permission: Permission;
  includeChildDocuments: boolean;
  published: boolean;
  urlId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface State {
  isFetching: boolean;
  isSaving: boolean;
  isLoaded: boolean;
}

interface Action {
  // API actions
  fetch: (docId: string, options?: FetchOptions) => Promise<ShareEntity[]>;
  create: (params: {
    documentId: string;
    published?: boolean;
    urlId?: string;
    includeChildDocuments?: boolean;
  }) => Promise<ShareEntity>;
  revoke: (id: string) => Promise<void>;

  // Helper methods
  getByDocId: (docId: string) => ShareEntity | undefined;
  getByDocParents: (docId: string) => ShareEntity | undefined;
  isPublished: (share: ShareEntity) => boolean;
  isRevoked: (share: ShareEntity) => boolean;
  isExpired: (share: ShareEntity) => boolean;
  updateShare: (share: ShareEntity) => void;
  handleShareUpdate: (shareId: string, updatedAt?: string) => Promise<void>;
  handleShareRemove: (shareId: string) => void;
}

const defaultState: State = {
  isFetching: false,
  isSaving: false,
  isLoaded: false,
};

const shareEntitySlice = createEntitySlice<ShareEntity>();
export const shareSelectors = shareEntitySlice.selectors;

type StoreState = State & Action & EntityState<ShareEntity> & EntityActions<ShareEntity>;
const useShareStore = create<StoreState>()(
  subscribeWithSelector(
    devtools(
      createComputed((state: StoreState) => ({
        publishedShares: shareSelectors.selectAll(state).filter((share) => state.isPublished(share)),
        revokedShares: shareSelectors.selectAll(state).filter((share) => state.isRevoked(share)),
        expiredShares: shareSelectors.selectAll(state).filter((share) => state.isExpired(share)),
      }))((set, get) => ({
        ...defaultState,
        ...shareEntitySlice.initialState,
        ...shareEntitySlice.createActions(set),

        isPublished: (share: ShareEntity) => share.published,
        isRevoked: (share: ShareEntity) => false, // API doesn't provide revokedAt
        isExpired: (share: ShareEntity) => false, // API doesn't provide expiresAt

        fetch: async (docId: string, options = {}) => {
          if (!options.prefetch) {
            set({ isFetching: true });
          }

          try {
            const { data } = await shareApi.getInfo({ documentId: docId });
            const shares = data.shares;
            get().setAll(shares);
            return shares;
          } finally {
            set({ isFetching: false });
          }
        },

        create: async ({ documentId, published = false, urlId, includeChildDocuments = false }) => {
          set({ isSaving: true });
          try {
            const response = await shareApi.create({
              documentId,
              published,
              urlId,
              includeChildDocuments,
            });
            get().addOne(response.data);
            return response.data;
          } finally {
            set({ isSaving: false });
          }
        },

        revoke: async (id: string) => {
          set({ isSaving: true });
          try {
            await shareApi.revoke({ id });
            get().removeOne(id);
          } finally {
            set({ isSaving: false });
          }
        },

        getByDocId: (docId: string) => {
          return shareSelectors.selectAll(get()).find((share) => share.documentId === docId);
        },

        getByDocParents: (docId: string) => {
          const document = useDocumentStore.getState().entities[docId];
          if (!document) return undefined;

          const parentIds = document.parentId ? [document.parentId] : [];
          for (const parentId of parentIds) {
            const share = get().getByDocId(parentId);
            if (share?.includeChildDocuments && get().isPublished(share)) {
              return share;
            }
          }
          return undefined;
        },

        updateShare: (share: ShareEntity) => {
          get().upsertOne(share);
        },

        handleShareUpdate: async (shareId: string, updatedAt?: string) => {
          const existing = get().entities[shareId];
          if (existing && updatedAt && existing.updatedAt === updatedAt) {
            return;
          }

          try {
            const { data } = await shareApi.getInfo({ id: shareId });
            if (data.shares.length > 0) {
              get().upsertOne(data.shares[0]);
            }
          } catch (error: any) {
            console.error(`Failed to update share ${shareId}:`, error);
            if (error.status === 404 || error.status === 403) {
              get().removeOne(shareId);
            }
          }
        },

        handleShareRemove: (shareId: string) => {
          get().removeOne(shareId);
        },
      })),
      {
        name: "shareStore",
      },
    ),
  ),
);

export default useShareStore;
