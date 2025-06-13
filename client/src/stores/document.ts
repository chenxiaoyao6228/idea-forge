import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import { DocTypeSchema, DocVisibilitySchema, NavigationNode, NavigationNodeType } from "contracts";
import { documentApi } from "@/apis/document";

import useSubSpaceStore from "./subspace";
import useStarStore from "./star";
import createEntitySlice, { EntityState, EntityActions } from "./utils/entity-slice";
import useWorkspaceStore from "./workspace";
import usePermissionStore from "./permission";

interface FetchOptions {
  force?: boolean;
  prefetch?: boolean;
  shareId?: string;
}

interface FetchDetailResult {
  data: { document: DocumentEntity; workspace?: any; sharedTree?: any };
  permissions?: any;
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
  // publishedAt?: string | null;
  // archivedAt?: string | null;
  // deletedAt?: string | null;
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

  // my-docs
  getMyDocsRootDocuments: () => NavigationNode[];
  getPathToDocumentInMyDocs: (documentId: string) => NavigationNode[];
  fetchMyDocsChildren: (parentId: string | null) => Promise<void>;
  createMyDocsDocument: (options: { title: string; parentId?: string | null }) => Promise<string>;
  moveToMyDocs: (documentId: string, parentId?: string | null, index?: number) => Promise<void>;
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
        // TODO: 这里靠谱吗? document detail node和navigation  node 的结构不一样, 有可能detail没有加载, 不会生成对应的navigation node
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
              }));
              get().upsertMany(documents);
            }

            if (response.permissions) {
              usePermissionStore.getState().setPermissions(response.permissions);
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
            const { data, permissions } = (await documentApi.getDocument(id)) as FetchDetailResult;

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
            const { documents: affectedDocuments, permissions } = await documentApi.moveDocument({
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

        // my-docs
        getMyDocsRootDocuments: (): NavigationNode[] => {
          const allDocs = documentSelectors.selectAll(get());
          return allDocs
            .filter((doc) => !doc.subspaceId && !doc.parentId) // mydocs 根文档
            .map((doc) => get().getDocumentAsNavigationNode(doc.id))
            .filter((node): node is NavigationNode => node !== undefined);
        },

        getPathToDocumentInMyDocs: (documentId: string): NavigationNode[] => {
          const allDocs = documentSelectors.selectAll(get());
          const myDocs = allDocs.filter((doc) => !doc.subspaceId);

          let path: NavigationNode[] = [];

          const findPath = (targetId: string, currentPath: NavigationNode[] = []): boolean => {
            const doc = myDocs.find((d) => d.id === targetId);
            if (!doc) return false;

            const node = get().getDocumentAsNavigationNode(doc.id);
            if (!node) return false;

            const newPath = [...currentPath, node];

            if (doc.id === documentId) {
              path = newPath;
              return true;
            }

            // 查找子文档
            const children = myDocs.filter((d) => d.parentId === doc.id);
            for (const child of children) {
              if (findPath(child.id, newPath)) {
                return true;
              }
            }

            return false;
          };

          // 从根文档开始查找
          const rootDocs = myDocs.filter((doc) => !doc.parentId);
          for (const root of rootDocs) {
            if (findPath(root.id)) {
              break;
            }
          }

          return path;
        },

        fetchMyDocsChildren: async (parentId: string | null) => {
          return get().fetchChildren(parentId, { force: false });
        },

        createMyDocsDocument: async (options: {
          title: string;
          parentId?: string | null;
        }) => {
          const workspaceId = useWorkspaceStore.getState().currentWorkspace?.id;
          if (!workspaceId) throw new Error("No active workspace");

          return get().createDocument({
            title: options.title,
            parentId: options.parentId || null,
            subspaceId: undefined,
            workspaceId,
          });
        },

        moveToMyDocs: async (documentId: string, parentId?: string | null, index?: number) => {
          return get().move({
            id: documentId,
            subspaceId: null,
            parentId: parentId || null,
            index,
          });
        },
      })),
      {
        name: "documentStore",
      },
    ),
  ),
);

export default useDocumentStore;
