import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import { DocTypeSchema, DocVisibilitySchema } from "contracts";
import { documentApi } from "@/apis/document";
import useWorkspaceStore from "./workspace-store";
import useSubSpaceStore from "./subspace";
import useStarStore from "./star";
import createEntitySlice, { EntityState } from "./utils/entity-slice";

interface FetchOptions {
  force?: boolean;
  prefetch?: boolean;
  shareId?: string;
}

interface FetchDetailResult {
  data: { document: DocumentEntity; workspace?: any; sharedTree?: any };
  policies?: any;
}

export interface DocumentEntity {
  id: string;
  title: string;
  content: string;
  workspaceId: string;
  subspaceId?: string | null;
  parentId?: string | null;
  type: string;
  visibility: string;
  publishedAt?: string | null;
  archivedAt?: string | null;
  deletedAt?: string | null;
  [key: string]: any;
}

interface State {
  isFetching: boolean;
  isSaving: boolean;
  isLoaded: boolean;
  activeDocumentId?: string;
  sharedCache: Record<string, { sharedTree: any; workspace: any }>;
}

interface Action {
  isArchived: (doc: DocumentEntity) => boolean;
  isDeleted: (doc: DocumentEntity) => boolean;
  isDraft: (doc: DocumentEntity) => boolean;
  fetchDetail: (id: string, options?: FetchOptions) => Promise<FetchDetailResult>;
  createDocument: (options: {
    title: string;
    parentId: string | null;
    subspaceId?: string;
    workspaceId?: string;
  }) => Promise<string>;
  updateDocument: (document: DocumentEntity) => void;
  setActiveDocument: (id?: string) => void;
  move: (params: {
    id: string;
    subspaceId?: string | null;
    parentId?: string | null;
    index?: number;
  }) => Promise<void>;
  needsUpdate: (id: string, updatedAt: Date) => boolean;
  handleDocumentUpdate: (documentId: string, updatedAt?: string) => Promise<void>;
  handleDocumentRemove: (documentId: string) => void;
  star: (documentId: string, index?: string) => Promise<void>;
  unStar: (documentId: string) => Promise<void>;
}

const defaultState: State = {
  isFetching: false,
  isSaving: false,
  isLoaded: false,
  activeDocumentId: undefined,
  sharedCache: {},
};

const documentEntitySlice = createEntitySlice<DocumentEntity>();
export const documentSelectors = documentEntitySlice.getSelectors();

const useDocumentStore = create(
  subscribeWithSelector(
    devtools(
      createComputed((state: State & Action & ReturnType<typeof documentEntitySlice.getState> & ReturnType<typeof documentEntitySlice.getActions>) => ({
        archivedDocuments: documentSelectors.selectAll(state).filter((doc) => state.isArchived(doc)),
        deletedDocuments: documentSelectors.selectAll(state).filter((doc) => state.isDeleted(doc)),
        draftDocuments: documentSelectors.selectAll(state).filter((doc) => state.isDraft(doc)),
        activeDocument: state.activeDocumentId ? state.entities[state.activeDocumentId] : undefined,
      }))((set, get) => ({
        ...defaultState,
        ...documentEntitySlice.getState(),
        ...documentEntitySlice.getActions(set),

        // Document status checkers
        isArchived: (doc: DocumentEntity) => !!doc.archivedAt,
        isDeleted: (doc: DocumentEntity) => !!doc.deletedAt,
        isDraft: (doc: DocumentEntity) => !doc.publishedAt,

        fetchDetail: async (id, options = {}) => {
          if (!options.prefetch) {
            set({ isFetching: true });
          }

          try {
            // check cache
            // const existing = get().entities[id];

            // if (existing && !options.shareId && !options.force) {
            //   return {
            //     data: { document: existing },
            //   };
            // }

            // // check shared cache
            // if (existing && options.shareId && !options.force && get().sharedCache[options.shareId]) {
            //   const cached = get().sharedCache[options.shareId];
            //   return {
            //     document: existing,
            //     ...cached,
            //   };
            // }

            const { data, policies } = (await documentApi.getDocument(id)) as FetchDetailResult;

            if (!data.document) {
              throw new Error("Document not available");
            }

            get().upsertOne(data.document);
            const document = data.document;
            // FIXME: temporary set, might need to be moved to components or other places
            get().setActiveDocument(document.id);
            if (document.subspaceId) {
              useSubSpaceStore.getState().setActiveSubspace(document.subspaceId);
            }

            // if (options.shareId && data.sharedTree) {
            //   set((state) => ({
            //     sharedCache: {
            //       ...state.sharedCache,
            //       [options.shareId!]: {
            //         sharedTree: data.sharedTree,
            //         workspace: data.workspace,
            //       },
            //     },
            //   }));

            //   return {
            //     data: { document, sharedTree: data.sharedTree, workspace: data.workspace },
            //   };
            // }

            return {
              data: { document, sharedTree: data.sharedTree, workspace: data.workspace },
            };
          } finally {
            set({ isFetching: false });
          }
        },

        createDocument: async ({ title, parentId, subspaceId }) => {
          set({ isSaving: true });
          try {
            const workspaceId = useWorkspaceStore.getState().currentWorkspace?.id;
            if (!workspaceId) throw new Error("No active workspace");

            // FIXME: ts error
            const response = (await documentApi.create({
              workspaceId,
              subspaceId: subspaceId || null,
              visibility: subspaceId ? DocVisibilitySchema.Enum.WORKSPACE : DocVisibilitySchema.Enum.PRIVATE,
              parentId: parentId || null,
              type: DocTypeSchema.Enum.NOTE,
              title,
              content: "",
            })) as any;

            // // Update subspace if needed
            // if (subspaceId) {
            //   useSubSpaceStore.getState().addDocument(subspaceId, response);
            // }

            get().addOne(response);
            return response.id;
          } catch (error) {
            console.error("Failed to create document:", error);
            throw error;
          } finally {
            set({ isSaving: false });
          }
        },

        updateDocument: (document: DocumentEntity) => {
          get().upsertOne(document);
        },

        move: async ({ id, subspaceId, parentId, index }) => {
          set({ isSaving: true });
          try {
            const { documents: affectedDocuments, policies } = await documentApi.moveDocument({
              id,
              subspaceId,
              parentId,
              index,
            });

            // FIXME: use websocket to inform update, so that everyone in the team can update immediately
            // use updatedAt to compare to avoid unnecessary updates
            if (subspaceId) {
              useSubSpaceStore.getState().fetchNavigationTree(subspaceId, { force: true });
            }

            // update documents
            get().upsertMany(affectedDocuments);
          } catch (error) {
            console.error("Failed to move document:", error);
            throw error;
          } finally {
            set({ isSaving: false });
          }
        },

        handleDocumentUpdate: async (documentId: string, updatedAt?: string) => {
          const existing = get().entities[documentId];

          // Check if update is needed
          if (existing && updatedAt && existing.updatedAt === updatedAt) {
            return;
          }

          try {
            // Force fetch latest version
            await get().fetchDetail(documentId, { force: true });
          } catch (error: any) {
            console.error(`Failed to update document ${documentId}:`, error);
            // Remove from local store if fetch fails (due to permissions or non-existence)
            if (error.status === 404 || error.status === 403) {
              get().removeOne(documentId);
            }
          }
        },

        handleDocumentRemove: (documentId: string) => {
          const document = get().entities[documentId];
          if (document?.subspaceId) {
            // 从 subspace 的导航树中移除
            useSubSpaceStore.getState().removeDocument(document.subspaceId, documentId);
          }
          get().removeOne(documentId);
        },

        needsUpdate: (id: string, updatedAt: Date) => {
          const existing = get().entities[id];
          if (!existing) return true;

          const existingDate = new Date(existing.updatedAt);
          return existingDate < updatedAt;
        },

        // UI state
        setActiveDocument: (id) => {
          set({ activeDocumentId: id });
        },

        star: async (documentId, index?) => {
          try {
            await useStarStore.getState().create({
              docId: documentId,
              index,
            });
          } catch (error) {
            console.error("Failed to star document:", error);
            throw error;
          }
        },

        unStar: async () => {
          try {
            const star = useStarStore.getState().getStarByTarget(document.id);
            if (star) {
              await useStarStore.getState().remove(star.id);
            }
          } catch (error) {
            console.error("Failed to unStar document:", error);
            throw error;
          }
        },
      })),
      {
        name: "documentStore",
      },
    ),
  ),
);

export default useDocumentStore;
