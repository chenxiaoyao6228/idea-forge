import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import { DocTypeSchema, DocVisibilitySchema, NavigationNode, NavigationNodeType } from "contracts";
import { documentApi } from "@/apis/document";

import useSubSpaceStore from "./subspace";
import useStarStore from "./star";
import createEntitySlice, { EntityState, EntityActions } from "./utils/entity-slice";
import useWorkspaceStore from "./workspace";

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
  // API actions
  fetchDetail: (id: string, options?: FetchOptions) => Promise<FetchDetailResult>;
  fetchChildren: (parentId: string | null, options?: { force?: boolean }) => Promise<void>;
  createDocument: (options: {
    title: string;
    parentId: string | null;
    subspaceId?: string;
    workspaceId?: string;
  }) => Promise<string>;
  move: (params: {
    id: string;
    subspaceId?: string | null;
    parentId?: string | null;
    index?: number;
  }) => Promise<void>;

  // Helper methods
  star: (documentId: string, index?: string) => Promise<void>;
  unStar: (documentId: string) => Promise<void>;
  isArchived: (doc: DocumentEntity) => boolean;
  isDeleted: (doc: DocumentEntity) => boolean;
  isDraft: (doc: DocumentEntity) => boolean;
  updateDocument: (document: DocumentEntity) => void;
  setActiveDocument: (id?: string) => void;
  needsUpdate: (id: string, updatedAt: Date) => boolean;
  handleDocumentUpdate: (documentId: string, updatedAt?: string) => Promise<void>;
  handleDocumentRemove: (documentId: string) => void;
}

const defaultState: State = {
  isFetching: false,
  isSaving: false,
  isLoaded: false,
  activeDocumentId: undefined,
  sharedCache: {},
};

const documentEntitySlice = createEntitySlice<DocumentEntity>();
export const documentSelectors = documentEntitySlice.selectors;

type StoreState = State & Action & EntityState<DocumentEntity> & EntityActions<DocumentEntity>;
const useDocumentStore = create<StoreState>()(
  subscribeWithSelector(
    devtools(
      createComputed((state: StoreState) => ({
        archivedDocuments: documentSelectors.selectAll(state).filter((doc) => state.isArchived(doc)),
        deletedDocuments: documentSelectors.selectAll(state).filter((doc) => state.isDeleted(doc)),
        draftDocuments: documentSelectors.selectAll(state).filter((doc) => state.isDraft(doc)),
        activeDocument: state.activeDocumentId ? state.entities[state.activeDocumentId] : undefined,
        getDocumentAsNavigationNode: (documentId: string): NavigationNode | undefined => {
          const doc = state.entities[documentId];
          if (!doc) return undefined;

          const children = Object.values(state.entities)
            .filter((child) => child.parentId === documentId)
            .map((child) => ({
              id: child.id,
              title: child.title,
              type: NavigationNodeType.Document,
              url: `/${child.id}`,
              children: [],
              parent: null,
              isDraft: !child.publishedAt,
              isArchived: !!child.archivedAt,
              isDeleted: !!child.deletedAt,
            }));

          return {
            id: doc.id,
            title: doc.title,
            type: NavigationNodeType.Document,
            url: `/${doc.id}`,
            children,
            parent: doc.parentId
              ? {
                  id: doc.parentId,
                  title: "",
                  type: NavigationNodeType.Document,
                  url: `/${doc.parentId}`,
                  children: [],
                  parent: null,
                }
              : null,
            // isDraft: !doc.publishedAt,
            // isArchived: !!doc.archivedAt,
            // isDeleted: !!doc.deletedAt,
          };
        },
        getChildDocuments: (parentId: string): NavigationNode[] => {
          return Object.values(state.entities)
            .filter((doc) => doc.parentId === parentId)
            .map((doc) => ({
              id: doc.id,
              title: doc.title,
              type: NavigationNodeType.Document,
              url: `/${doc.id}`,
              children: [],
              parent: null,
              isDraft: !doc.publishedAt,
              isArchived: !!doc.archivedAt,
              isDeleted: !!doc.deletedAt,
            }));
        },
      }))((set, get) => ({
        ...defaultState,
        ...documentEntitySlice.initialState,
        ...documentEntitySlice.createActions(set),

        isArchived: (doc: DocumentEntity) => !!doc.archivedAt,
        isDeleted: (doc: DocumentEntity) => !!doc.deletedAt,
        isDraft: (doc: DocumentEntity) => !doc.publishedAt,

        fetchChildren: async (parentId: string | null, options = {}) => {
          if (!options.force) {
            const existingDocs = documentSelectors.selectAll(get());
            const hasChildren = existingDocs.some((doc) => doc.parentId === parentId);
            if (hasChildren) return;
          }

          set({ isFetching: true });
          try {
            const workspaceId = useWorkspaceStore.getState().currentWorkspace?.id;
            if (!workspaceId) throw new Error("No active workspace");

            const response = await documentApi.list({
              parentId,
              page: 1,
              limit: 100,
              sortBy: "position",
              sortOrder: "asc",
              archivedAt: null,
              workspaceId,
              subspaceId: null,
            });

            if (response.data) {
              // Transform the response data to match DocumentEntity type
              const documents = response.data.map((doc) => ({
                ...doc,
                content: "",
                type: "NOTE",
                visibility: "WORKSPACE",
                workspaceId,
                archivedAt: doc.archivedAt?.toISOString() || null,
                deletedAt: doc.deletedAt?.toISOString() || null,
                createdAt: doc.createdAt.toISOString(),
                updatedAt: doc.updatedAt.toISOString(),
              }));
              get().upsertMany(documents);
            }
          } catch (error) {
            console.error("Failed to fetch children:", error);
            throw error;
          } finally {
            set({ isFetching: false });
          }
        },

        fetchDetail: async (id, options = {}) => {
          if (!options.prefetch) {
            set({ isFetching: true });
          }

          try {
            const { data, policies } = (await documentApi.getDocument(id)) as FetchDetailResult;

            if (!data.document) {
              throw new Error("Document not available");
            }

            get().upsertOne(data.document);
            const document = data.document;
            get().setActiveDocument(document.id);
            if (document.subspaceId) {
              useSubSpaceStore.getState().setActiveSubspace(document.subspaceId);
            }

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

            const response = (await documentApi.create({
              workspaceId,
              subspaceId: subspaceId || null,
              visibility: subspaceId ? DocVisibilitySchema.Enum.WORKSPACE : DocVisibilitySchema.Enum.PRIVATE,
              parentId: parentId || null,
              type: DocTypeSchema.Enum.NOTE,
              title,
              content: "",
            })) as any;

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

            if (subspaceId) {
              useSubSpaceStore.getState().fetchNavigationTree(subspaceId, { force: true });
            }

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

          if (existing && updatedAt && existing.updatedAt === updatedAt) {
            return;
          }

          try {
            await get().fetchDetail(documentId, { force: true });
          } catch (error: any) {
            console.error(`Failed to update document ${documentId}:`, error);
            if (error.status === 404 || error.status === 403) {
              get().removeOne(documentId);
            }
          }
        },

        handleDocumentRemove: (documentId: string) => {
          const document = get().entities[documentId];
          if (document?.subspaceId) {
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

        unStar: async (documentId: string) => {
          try {
            const star = useStarStore.getState().getStarByTarget(documentId);
            if (star) {
              await useStarStore.getState().remove(star.id);
            }
          } catch (error) {
            console.error("Failed to unStar document:", error);
            throw error;
          }
        },

        // permission
        fetchDocumentMemberships: async (documentId: string) => {
          return documentApi.listUserPermissions(documentId);
        },

        addUserToDocument: async (documentId: string, userId: string, permission: "EDIT" | "READ" | "NONE") => {
          return documentApi.addUserPermission(documentId, { userId, permission });
        },

        removeUserFromDocument: async (documentId: string, targetUserId: number) => {
          return documentApi.removeUserPermission(documentId, targetUserId);
        },
      })),
      {
        name: "documentStore",
      },
    ),
  ),
);

export default useDocumentStore;
