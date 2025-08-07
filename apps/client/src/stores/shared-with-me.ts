import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import { createPaginationSlice, PaginationSlice } from "./utils/pagination-slice";
import { documentApi } from "@/apis/document";
import useDocumentStore, { DocumentEntity } from "./document";
import useAbilityStore from "./ability";
import useUserStore from "./user";
import useWorkspaceStore from "./workspace";

const STORE_NAME = "sharedWithMeStore";

interface SharedWithMeState {
  documents: DocumentEntity[];
  allAbilities: Record<string, Record<string, boolean>>;
  isOpen: boolean;
  userToggled: boolean;
}

interface SharedWithMeActions {
  fetchSharedDocuments: (options?: { append?: boolean }) => Promise<void>;
  fetchNextPage: () => Promise<void>;
  setOpen: (isOpen: boolean) => void;
  setUserToggled: (toggled: boolean) => void;
  handleWebsocketAbilityChange: (abilities: any[]) => void;
  handleWebsocketDocumentShare: (document: DocumentEntity) => void;
  handleWebsocketReconnect: () => void;

  reset: () => void;
}

interface SharedWithMeSlice extends SharedWithMeState, SharedWithMeActions, PaginationSlice {}

const defaultState: SharedWithMeState = {
  documents: [],
  allAbilities: {},
  isOpen: false,
  userToggled: false,
};

type StoreState = SharedWithMeSlice;

const useSharedWithMeStore = create<StoreState>()(
  subscribeWithSelector(
    devtools(
      createComputed((state: StoreState) => ({
        // Computed values can be added here if needed
        hasDocuments: state.documents.length > 0,
        isVisible: state.documents.length > 0 || state.isLoading,
      }))((set, get) => {
        const paginationSlice = createPaginationSlice(set, get, {
          setState: set,
          getState: get,
          // @ts-ignore
          getInitialState: () => defaultState,
          subscribe: () => () => {},
        });

        return {
          ...defaultState,
          ...paginationSlice,

          fetchSharedDocuments: async (options = {}) => {
            const { append = false } = options;
            const { page, limit, isLoading, isLoadingMore } = get();

            // Prevent duplicate requests
            if (isLoading || isLoadingMore) return;

            try {
              // Set appropriate loading state
              if (append) {
                get().setLoadingMore(true);
              } else {
                get().setLoading(true);
              }

              const userInfo = useUserStore.getState().userInfo;
              const currentWorkspace = useWorkspaceStore.getState().currentWorkspace;

              if (!userInfo?.id) {
                throw new Error("User not authenticated");
              }

              const response = await documentApi.getSharedWithMe({
                page: append ? page : 1,
                limit,
                workspaceId: currentWorkspace?.id,
              });

              const { data, abilities, pagination } = response;

              // Update documents
              const newDocuments = append ? [...get().documents, ...data.documents] : data.documents;

              // Update abilities (renamed from permissions for consistency)
              const updatedAbilities = append ? { ...get().allAbilities, ...abilities } : abilities;

              // Update pagination meta
              if (pagination) {
                get().setPaginationMeta({
                  total: pagination.total,
                  page: pagination.page,
                  limit: pagination.limit,
                });
              }

              set({
                documents: newDocuments,
                allAbilities: updatedAbilities,
                error: null,
              });

              // Update document and ability stores
              useDocumentStore.getState().upsertMany(data.documents);
              useAbilityStore.getState().setAbilities(updatedAbilities);

              // Auto-expand if there are documents and user hasn't manually toggled
              if (newDocuments.length > 0 && !get().isOpen && !get().userToggled) {
                set({ isOpen: true });
              }
            } catch (error: any) {
              console.error("[SharedWithMe] Fetch error:", error);
              get().setError(error.message || "Failed to fetch shared documents");
            } finally {
              get().setLoading(false);
              get().setLoadingMore(false);
            }
          },

          fetchNextPage: async () => {
            const { hasNextPage } = get();
            if (!hasNextPage) return;

            get().nextPage();
            await get().fetchSharedDocuments({ append: true });
          },

          setOpen: (isOpen) => {
            set({ isOpen });
          },

          setUserToggled: (userToggled) => {
            set({ userToggled });
          },

          handleWebsocketAbilityChange: (abilities) => {
            const { documents } = get();

            get().resetPagination();
            get().fetchSharedDocuments();
          },

          handleWebsocketDocumentShare: (document: DocumentEntity) => {
            // Update document in the document store

            const newDocuments = [document, ...get().documents];

            set({ documents: newDocuments });

            // Auto-expand the shared with me section if not already open and user hasn't manually toggled
            if (!get().isOpen && !get().userToggled) {
              set({ isOpen: true });
            }
          },

          handleWebsocketReconnect: () => {
            // Refetch shared documents when websocket reconnects
            // (user might have gained new abilities while offline)
            get().resetPagination();
            get().fetchSharedDocuments();
          },

          reset: () => {
            set({
              ...defaultState,
              ...paginationSlice,
            });
          },
        };
      }),
      {
        name: STORE_NAME,
      },
    ),
  ),
);

export default useSharedWithMeStore;
