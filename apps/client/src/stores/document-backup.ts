import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import { CoverImage, DocTypeSchema, DocVisibilitySchema, SubspaceTypeSchema } from "@idea/contracts";
import { NavigationNode, NavigationNodeType } from "@idea/contracts";
import { documentApi } from "@/apis/document";
import useSubSpaceStore, { getPersonalSubspace } from "./subspace";
import { useStars } from "./star-store";
import createEntitySlice, { EntityState, EntityActions } from "./utils/entity-slice";
import useWorkspaceStore from "./workspace-store";
import useAbilityStore from "./ability-store";

const STORE_NAME = "documentStore";

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
  lastModifiedById?: string;
  createdById?: string;
  updatedAt: string;
  createdAt: string;
  [key: string]: any;
}

interface State {
  isFetching: boolean;
  isSaving: boolean;
  isLoaded: boolean;
  activeDocumentId?: string;
  sharedCache: Record<string, { sharedTree: any; workspace: any }>;
  movingDocumentId: string | null; // track moving state
}

interface Action {
  // Existing API actions
  fetchDetail: (id: string, options?: FetchOptions) => Promise<FetchDetailResult>;
  fetchChildren: ({
    parentId,
    subspaceId,
    sharedDocumentId,
    options,
  }: { parentId: string; subspaceId: string | null; sharedDocumentId?: string; options?: { force?: boolean } }) => Promise<void>;
  createDocument: (options: {
    title: string;
    parentId: string | null;
    subspaceId: string | null;
    workspaceId?: string;
  }) => Promise<string>;
  move: (params: {
    id: string;
    subspaceId?: string | null;
    oldSubspaceId?: string | null;
    parentId?: string | null;
    index?: number;
  }) => Promise<void>;

  //document lifecycle methods
  publish: (documentId: string, subspaceId: string, options?: { user?: any }) => Promise<void>;
  unpublish: (documentId: string, options?: { detach?: boolean; user?: any }) => Promise<void>;
  archive: (documentId: string, options?: { user?: any }) => Promise<void>;
  restore: (documentId: string, subspaceId: string, options?: { user?: any }) => Promise<void>;
  delete: (documentId: string, options?: { permanent?: boolean; user?: any }) => Promise<void>;

  //navigation and structure methods
  toNavigationNode: (documentId: string) => NavigationNode | undefined;
  addToSubspaceStructure: (documentId: string, subspaceId: string, index?: number) => void;
  removeFromSubspaceStructure: (documentId: string, subspaceId: string) => void;
  updateInSubspaceStructure: (documentId: string, subspaceId: string, updates: Partial<DocumentEntity>) => void;

  //child management
  findAllChildDocumentIds: (documentId: string) => string[];
  findChildDocuments: (documentId: string) => DocumentEntity[];
  findDescendants: (documentId: string) => DocumentEntity[];

  // Existing helper methods
  isArchived: (doc: DocumentEntity) => boolean;
  isDeleted: (doc: DocumentEntity) => boolean;
  isDraft: (doc: DocumentEntity) => boolean;
  isPublished: (doc: DocumentEntity) => boolean;
  updateDocument: (document: DocumentEntity) => void;
  setActiveDocument: (id?: string) => void;
  needsUpdate: (id: string, updatedAt: Date) => boolean;
  handleDocumentUpdate: (documentId: string, updatedAt?: string) => Promise<void>;
  handleDocumentRemove: (documentId: string) => void;

  getPersonalRootDocuments: () => NavigationNode[];
  getPathToDocumentInMyDocs: (documentId: string) => NavigationNode[];
  createMyDocsDocument: (options: {
    title: string;
    parentId?: string | null;
  }) => Promise<string>;
  moveToMyDocs: (documentId: string, parentId?: string | null, index?: number) => Promise<void>;
}

const defaultState: State = {
  isFetching: false,
  isSaving: false,
  isLoaded: false,
  activeDocumentId: undefined,
  sharedCache: {},
  movingDocumentId: null,
};

const documentEntitySlice = createEntitySlice<DocumentEntity>();
export const documentSelectors = documentEntitySlice.selectors;

type StoreState = State & Action & EntityState<DocumentEntity> & EntityActions<DocumentEntity>;

const useDocumentStore = create<StoreState>()(
  subscribeWithSelector(
    devtools(
      createComputed((state: StoreState) => ({
        // Existing computed properties
        archivedDocuments: documentSelectors.selectAll(state).filter((doc) => state.isArchived(doc)),
        deletedDocuments: documentSelectors.selectAll(state).filter((doc) => state.isDeleted(doc)),
        draftDocuments: documentSelectors.selectAll(state).filter((doc) => state.isDraft(doc)),
        publishedDocuments: documentSelectors.selectAll(state).filter((doc) => state.isPublished(doc)),
        activeDocument: state.activeDocumentId ? state.entities[state.activeDocumentId] : undefined,

        //computed properties
        inSubspace: (subspaceId: string) => documentSelectors.selectAll(state).filter((doc) => doc.subspaceId === subspaceId),

        rootInSubspace: (subspaceId: string) => documentSelectors.selectAll(state).filter((doc) => doc.subspaceId === subspaceId && !doc.parentId),

        publishedInSubspace: (subspaceId: string) =>
          documentSelectors.selectAll(state).filter((doc) => doc.subspaceId === subspaceId && state.isPublished(doc)),

        draftsInSubspace: (subspaceId: string) => documentSelectors.selectAll(state).filter((doc) => doc.subspaceId === subspaceId && state.isDraft(doc)),

        archivedInSubspace: (subspaceId: string) => documentSelectors.selectAll(state).filter((doc) => doc.subspaceId === subspaceId && state.isArchived(doc)),

        // Navigation node conversion
        getDocumentAsNavigationNode: (documentId: string): NavigationNode | undefined => {
          const doc = state.entities[documentId];
          if (!doc) return undefined;

          const children = Object.values(state.entities)
            .filter((child) => child.parentId === documentId)
            .map((child) => state.toNavigationNode(child.id))
            .filter(Boolean) as NavigationNode[];

          return {
            id: doc.id,
            title: doc.title,
            type: NavigationNodeType.Document,
            url: `/${doc.id}`,
            children,
            parent: null,
          };
        },

        getChildDocuments: (parentId: string): NavigationNode[] => {
          return Object.values(state.entities)
            .filter((doc) => doc.parentId === parentId)
            .map((doc) => state.toNavigationNode(doc.id))
            .filter(Boolean) as NavigationNode[];
        },
      }))((set, get) => ({
        ...defaultState,
        ...documentEntitySlice.initialState,
        ...documentEntitySlice.createActions(set),

        // Existing helper methods
        isArchived: (doc: DocumentEntity) => !!doc.archivedAt,
        isDeleted: (doc: DocumentEntity) => !!doc.deletedAt,
        isDraft: (doc: DocumentEntity) => !doc.publishedAt,
        isPublished: (doc: DocumentEntity) => !!doc.publishedAt,

        //document lifecycle methods
        publish: async (documentId, subspaceId, options = {}) => {
          const doc = get().entities[documentId];
          if (!doc) throw new Error("Document not found");

          set({ isSaving: true });
          try {
            // Update document
            get().updateOne({
              id: documentId,
              changes: {
                publishedAt: new Date().toISOString(),
                subspaceId,
                lastModifiedById: options.user?.id || doc.lastModifiedById,
                updatedAt: new Date().toISOString(),
              },
            });

            // Add to subspace structure
            useSubSpaceStore.getState().addDocument(subspaceId, doc);
          } finally {
            set({ isSaving: false });
          }
        },

        unpublish: async (documentId, options = { detach: false }) => {
          const doc = get().entities[documentId];
          if (!doc) throw new Error("Document not found");

          set({ isSaving: true });
          try {
            // Remove from subspace structure
            if (doc.subspaceId) {
              useSubSpaceStore.getState().removeDocument(doc.subspaceId, documentId);
            }

            // Update document
            get().updateOne({
              id: documentId,
              changes: {
                publishedAt: null,
                subspaceId: options.detach ? null : doc.subspaceId,
                lastModifiedById: options.user?.id || doc.lastModifiedById,
                updatedAt: new Date().toISOString(),
              },
            });
          } finally {
            set({ isSaving: false });
          }
        },

        archive: async (documentId, options = {}) => {
          const doc = get().entities[documentId];
          if (!doc) throw new Error("Document not found");

          set({ isSaving: true });
          try {
            // Remove from subspace structure
            if (doc.subspaceId) {
              useSubSpaceStore.getState().removeDocument(doc.subspaceId, documentId);
            }

            // Archive document and all children
            const childIds = get().findAllChildDocumentIds(documentId);
            const allIds = [documentId, ...childIds];

            get().updateMany(
              allIds.map((id) => ({
                id,
                changes: {
                  archivedAt: new Date().toISOString(),
                  lastModifiedById: options.user?.id || doc.lastModifiedById,
                  updatedAt: new Date().toISOString(),
                },
              })),
            );
          } finally {
            set({ isSaving: false });
          }
        },

        restore: async (documentId, subspaceId, options = {}) => {
          const doc = get().entities[documentId];
          if (!doc) throw new Error("Document not found");

          set({ isSaving: true });
          try {
            // Restore document and all children
            const childIds = get().findAllChildDocumentIds(documentId);
            const allIds = [documentId, ...childIds];

            get().updateMany(
              allIds.map((id) => ({
                id,
                changes: {
                  archivedAt: null,
                  subspaceId,
                  lastModifiedById: options.user?.id || doc.lastModifiedById,
                  updatedAt: new Date().toISOString(),
                },
              })),
            );

            // Add back to subspace structure if published
            if (doc.publishedAt) {
              useSubSpaceStore.getState().addDocument(subspaceId, doc);
            }
          } finally {
            set({ isSaving: false });
          }
        },

        delete: async (documentId, options = { permanent: false }) => {
          const doc = get().entities[documentId];
          if (!doc) throw new Error("Document not found");

          set({ isSaving: true });
          try {
            if (options.permanent) {
              // Remove from subspace structure
              if (doc.subspaceId) {
                useSubSpaceStore.getState().removeDocument(doc.subspaceId, documentId);
              }

              // Remove from store
              get().removeOne(documentId);
            } else {
              // Soft delete
              get().updateOne({
                id: documentId,
                changes: {
                  deletedAt: new Date().toISOString(),
                  lastModifiedById: options.user?.id || doc.lastModifiedById,
                  updatedAt: new Date().toISOString(),
                },
              });
            }
          } finally {
            set({ isSaving: false });
          }
        },

        //navigation and structure methods
        toNavigationNode: (documentId) => {
          const doc = get().entities[documentId];
          if (!doc) return undefined;

          const children = get()
            .findChildDocuments(documentId)
            .map((child) => get().toNavigationNode(child.id))
            .filter(Boolean) as NavigationNode[];

          return {
            id: doc.id,
            title: doc.title,
            type: NavigationNodeType.Document,
            url: `/${doc.id}`,
            children,
            parent: null,
          };
        },

        addToSubspaceStructure: (documentId, subspaceId, index = 0) => {
          const doc = get().entities[documentId];
          if (!doc) return;

          useSubSpaceStore.getState().addDocument(subspaceId, doc);
        },

        removeFromSubspaceStructure: (documentId, subspaceId) => {
          useSubSpaceStore.getState().removeDocument(subspaceId, documentId);
        },

        updateInSubspaceStructure: (documentId, subspaceId, updates) => {
          useSubSpaceStore.getState().updateDocument(subspaceId, documentId, updates);
        },

        //child management
        findAllChildDocumentIds: (documentId) => {
          const allDocs = documentSelectors.selectAll(get());
          const result: string[] = [];

          const findChildren = (parentId: string) => {
            const children = allDocs.filter((doc) => doc.parentId === parentId);
            children.forEach((child) => {
              result.push(child.id);
              findChildren(child.id);
            });
          };

          findChildren(documentId);
          return result;
        },

        findChildDocuments: (documentId) => {
          return documentSelectors.selectAll(get()).filter((doc) => doc.parentId === documentId);
        },

        findDescendants: (documentId) => {
          const allDocs = documentSelectors.selectAll(get());
          const result: DocumentEntity[] = [];

          const findChildren = (parentId: string) => {
            const children = allDocs.filter((doc) => doc.parentId === parentId);
            children.forEach((child) => {
              result.push(child);
              findChildren(child.id);
            });
          };

          findChildren(documentId);
          return result;
        },

        // Enhanced move method withlogic
        move: async ({ id, subspaceId, parentId, index }) => {
          set({ movingDocumentId: id, isSaving: true });
          try {
            // Call API
            const res = await documentApi.moveDocument({
              id,
              subspaceId,
              parentId,
              index,
            });

            if (res.data) {
              get().upsertMany(res.data);
            }

            if (res.permissions) {
              // Convert permissions to ability entities and update store directly
              const entities = Object.entries(res.permissions).map(([id, abilities]) => ({
                id,
                abilities: { ...{ read: false, update: false, delete: false, share: false, comment: false }, ...(abilities as Record<string, boolean>) },
              }));
              useAbilityStore.setState((state) => {
                const newAbilities = { ...state.abilities };
                entities.forEach((entity) => {
                  newAbilities[entity.id] = entity;
                });
                return { abilities: newAbilities };
              });
            }
          } finally {
            set({ movingDocumentId: null, isSaving: false });
          }
        },

        fetchChildren: async ({ parentId, subspaceId, sharedDocumentId, options = {} }) => {
          if (!options.force) {
            const existingDocs = documentSelectors.selectAll(get());
            const hasChildren = existingDocs.some((doc) => doc.parentId === parentId);
            if (hasChildren) return;
          }

          set({ isFetching: true });
          try {
            const response = await documentApi.list({
              parentId: parentId,
              page: 1,
              limit: 100,
              sortBy: "updatedAt",
              sortOrder: "asc",
              subspaceId: subspaceId || undefined,
              archivedAt: undefined,
              sharedDocumentId,
            });

            if (response.data) {
              // Transform the response data to match DocumentEntity type
              const documents = response.data.map((doc) => ({
                ...doc,
              })) as unknown as DocumentEntity[];
              get().upsertMany(documents);
            }

            if (response.permissions) {
              // Convert permissions to ability entities and update store directly
              const entities = Object.entries(response.permissions).map(([id, abilities]) => ({
                id,
                abilities: { ...{ read: false, update: false, delete: false, share: false, comment: false }, ...(abilities as Record<string, boolean>) },
              }));
              useAbilityStore.setState((state) => {
                const newAbilities = { ...state.abilities };
                entities.forEach((entity) => {
                  newAbilities[entity.id] = entity;
                });
                return { abilities: newAbilities };
              });
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

            const isPrivateSubspace = subspaceId ? useSubSpaceStore.getState().entities[subspaceId]?.type === SubspaceTypeSchema.enum.PERSONAL : false;

            const response = (await documentApi.create({
              workspaceId,
              subspaceId: subspaceId || null,
              visibility: isPrivateSubspace ? DocVisibilitySchema.enum.PRIVATE : DocVisibilitySchema.enum.WORKSPACE,
              parentId: parentId || null,
              type: DocTypeSchema.enum.NOTE,
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

        updateDocument: (document) => {
          get().upsertOne(document);
        },

        handleDocumentUpdate: async (documentId, updatedAt) => {
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

        handleDocumentRemove: (documentId) => {
          const document = get().entities[documentId];
          if (document?.subspaceId) {
            useSubSpaceStore.getState().removeDocument(document.subspaceId, documentId);
          }
          get().removeOne(documentId);
        },

        needsUpdate: (id, updatedAt) => {
          const existing = get().entities[id];
          if (!existing) return true;

          const existingDate = new Date(existing.updatedAt);
          return existingDate < updatedAt;
        },

        setActiveDocument: (id) => {
          set({ activeDocumentId: id });
        },

        getPersonalRootDocuments: () => {
          const personalSubspace = getPersonalSubspace(useSubSpaceStore.getState());
          return personalSubspace?.navigationTree || [];
        },

        getPathToDocumentInMyDocs: (documentId) => {
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

          const rootDocs = myDocs.filter((doc) => !doc.parentId);
          for (const root of rootDocs) {
            if (findPath(root.id)) {
              break;
            }
          }

          return path;
        },

        createMyDocsDocument: async ({ title, parentId = null }) => {
          const personalSubspace = getPersonalSubspace(useSubSpaceStore.getState());
          if (!personalSubspace) throw new Error("No my-docs subspace found");
          const workspaceId = useWorkspaceStore.getState().currentWorkspace?.id;
          if (!workspaceId) throw new Error("No active workspace");
          const wsId = workspaceId!;
          const response = await documentApi.create({
            title,
            content: "",
            parentId,
            subspaceId: personalSubspace.id,
            workspaceId: wsId,
            type: DocTypeSchema.enum.NOTE,
            visibility: DocVisibilitySchema.enum.PRIVATE,
          });
          return response.id;
        },

        moveToMyDocs: async (documentId, parentId, index) => {
          const personalSubspace = getPersonalSubspace(useSubSpaceStore.getState());
          if (!personalSubspace) throw new Error("No my-docs subspace found");
          await documentApi.moveDocument({
            id: documentId,
            subspaceId: personalSubspace.id,
            parentId: parentId ?? null,
            index,
          });
        },
      })),
      {
        name: STORE_NAME,
      },
    ),
  ),
);

export default useDocumentStore;
