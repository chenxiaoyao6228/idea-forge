import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import { CoverImage, DocTypeSchema, DocVisibilitySchema, NavigationNode, NavigationNodeType } from "@idea/contracts";
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
  silent?: boolean;
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
  coverImage?: CoverImage;
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
    subspaceId: string | null;
    workspaceId?: string;
  }) => Promise<string>;
  move: (params: {
    id: string;
    subspaceId?: string | null;
    parentId?: string | null;
    index?: string;
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
  createMyDocsDocument: (options: {
    title: string;
    parentId?: string | null;
  }) => Promise<string>;
  moveToMyDocs: (documentId: string, parentId?: string | null, index?: string) => Promise<void>;
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
              index: child.index,
              subspaceId: child.subspaceId || null,
              parent: null,
              type: NavigationNodeType.Document,
              url: `/${child.id}`,
              children: [],
              isDraft: !child.publishedAt,
              isArchived: !!child.archivedAt,
              isDeleted: !!child.deletedAt,
            }));

          return {
            id: doc.id,
            title: doc.title,
            subspaceId: doc.subspaceId || null,
            parentId: doc.parentId || null,
            index: doc.index,
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
              sortBy: "index",
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
              })) as unknown as DocumentEntity[];
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

            // Only set active states if not in silent mode
            if (!options.silent) {
              get().setActiveDocument(document.id);
              if (document.subspaceId) {
                useSubSpaceStore.getState().setActiveSubspace(document.subspaceId);
              }
            }

            return {
              data: {
                document,
                sharedTree: data.sharedTree,
                workspace: data.workspace,
              },
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
            const safeIndex = typeof index === "string" && index.length > 0 ? index : "z";
            const { permissions } = await documentApi.moveDocument({
              id,
              subspaceId,
              parentId,
              index: safeIndex,
            });
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
            // Use silent mode to avoid setting active states during batch updates
            await get().fetchDetail(documentId, { force: true, silent: true });

            const updatedDocument = get().entities[documentId];

            // Handle my-docs reordering - check if document moved in/out of my-docs
            if (updatedDocument && existing) {
              const wasInMyDocs = !existing.subspaceId;
              const isInMyDocs = !updatedDocument.subspaceId;

              // If document structure changed (moved between my-docs and subspace)
              if (wasInMyDocs !== isInMyDocs) {
                // Trigger my-docs refresh if needed
                if (wasInMyDocs || isInMyDocs) {
                  // Could emit a custom event or call a refresh method
                  console.log(`Document ${documentId} moved between my-docs and subspace`);
                }
              } else {
                // log all my docs
                console.log(
                  "my docs",
                  get()
                    .getMyDocsRootDocuments()
                    .map((doc) => ({
                      title: doc.title,
                      index: doc.index,
                    })),
                );
                // my doc order changed
                console.log(`Document ${documentId} order changed in my-docs`);
                get().upsertOne(updatedDocument);
              }

              // Handle subspace navigation tree updates
              if (
                updatedDocument.subspaceId &&
                (existing.title !== updatedDocument.title || existing.parentId !== updatedDocument.parentId || existing.index !== updatedDocument.index)
              ) {
                await useSubSpaceStore.getState().fetchNavigationTree(updatedDocument.subspaceId, {
                  force: true,
                });
              }
            }
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
              subspaceId: null,
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
          const orderedDocs = allDocs
            .filter((doc) => !doc.subspaceId && !doc.parentId)
            .sort((a, b) => {
              // Sort by fractional index, fallback to creation date
              if (a.index && b.index) {
                return a.index.localeCompare(b.index);
              }
              if (a.index && !b.index) return -1;
              if (!a.index && b.index) return 1;
              return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            })
            .map((doc) => get().getDocumentAsNavigationNode(doc.id))
            .filter((node): node is NavigationNode => node !== undefined);

          console.log(
            "my orderedDocs",
            orderedDocs.map((doc) => ({
              title: doc.title,
              index: doc.index,
            })),
          );

          return orderedDocs;
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
            subspaceId: null,
            workspaceId,
          });
        },

        moveToMyDocs: async (documentId: string, parentId?: string | null, index?: string) => {
          const safeIndex = typeof index === "string" && index.length > 0 ? index : "z";
          return get().move({
            id: documentId,
            subspaceId: null,
            parentId: parentId || null,
            index: safeIndex,
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
