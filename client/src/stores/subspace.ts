import { create } from "zustand";
import { subspaceApi } from "@/apis/subspace";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import { Doc, NavigationNode, NavigationNodeType } from "contracts";
import createEntitySlice, { EntityState } from "./utils/entity-slice";
import { produce } from "immer";
import { get } from "react-hook-form";

export interface SubspaceEntity {
  id: string;
  name: string;
  avatar?: string | null;
  workspaceId: string;
  type: string;
  index: number;
  navigationTree: NavigationNode[];
  url?: string;
}

interface State {
  isLoading: boolean;
  isLoaded: boolean;
  activeSubspaceId?: string;
}

interface Action {
  // api actions
  fetchList: () => Promise<SubspaceEntity[]>;
  create: (payload: {
    name: string;
    description: string;
    avatar?: string;
    type: string;
    workspaceId: string;
  }) => Promise<SubspaceEntity>;

  addDocument: (subspaceId: string, document: Doc) => void;
  updateDocument: (subspaceId: string, documentId: string, updates: Partial<Doc>) => void;
  removeDocument: (subspaceId: string, documentId: string) => void;
  fetchNavigationTree: (subspaceId: string, options?: { force?: boolean }) => Promise<void>;
  asNavigationTree: (subspaceId: string) => NavigationNode;
  getPathToDocument: (subspaceId: string, documentId: string) => NavigationNode[];
  containsDocument: (subspaceId: string, documentId: string) => boolean;
  getExpandedKeysForDocument: (subspaceId: string, documentId: string) => string[];
  setActiveSubspace: (id?: string) => void;
}

const defaultState: State = {
  isLoading: false,
  isLoaded: false,
  activeSubspaceId: undefined,
};

const subspaceEntitySlice = createEntitySlice<SubspaceEntity>();
export const subspaceSelectors = subspaceEntitySlice.getSelectors();

const useSubSpaceStore = create(
  subscribeWithSelector(
    devtools(
      createComputed((state: State & Action & ReturnType<typeof subspaceEntitySlice.getState> & ReturnType<typeof subspaceEntitySlice.getActions>) => ({
        allSubspaces: subspaceSelectors.selectAll(state),
        allSubspacesAsNavigationNodes: subspaceSelectors.selectAll(state).map((subspace) => ({
          type: NavigationNodeType.Subspace,
          id: subspace.id,
          title: subspace.name,
          // color: subspace.color ?? undefined,
          icon: subspace.avatar ?? undefined,
          url: subspace.url ?? `/subspace/${subspace.id}`,
          children: subspace.navigationTree ?? [],
        })),
      }))((set, get) => ({
        ...defaultState,
        ...subspaceEntitySlice.getState(),
        ...subspaceEntitySlice.getActions(set),

        asNavigationTree: (subspaceId: string) => {
          const subspace = get().entities[subspaceId];
          if (!subspace) return {} as NavigationNode;
          return {
            id: subspace.id,
            title: subspace.name,
            type: NavigationNodeType.Subspace,
            // FIXME:
            // url: doc.url || "",
            url: "",
            children: subspaceSelectors.selectById(subspaceId)(get()).navigationTree,
            parent: null,
          } as NavigationNode;
        },

        // API Actions
        fetchList: async () => {
          set({ isLoading: true });
          try {
            const response = (await subspaceApi.getSubspaces()) as any;
            const subspaces = response.map((subspace) => ({
              id: subspace.id,
              name: subspace.name,
              avatar: subspace.avatar,
              workspaceId: subspace.workspaceId,
              type: subspace.type,
              index: subspace.index || 0,
              navigationTree: [],
            }));

            get().setAll(subspaces);
            set({ isLoaded: true });
            return subspaces;
          } catch (error) {
            console.error("Failed to fetch subspaces:", error);
            return [];
          } finally {
            set({ isLoading: false });
          }
        },

        create: async (payload) => {
          try {
            // FIXME:
            const response = (await subspaceApi.createSubspace(payload as any)) as any;
            const subspace = {
              id: response.id,
              name: response.name,
              avatar: response.avatar,
              workspaceId: response.workspaceId,
              type: response.type,
              index: response.index || 0,
              navigationTree: [],
            };
            get().addOne(subspace);
            return subspace;
          } catch (error) {
            console.error("Failed to create subspace:", error);
            throw error;
          }
        },

        // Document operations with navigation tree support
        addDocument: (subspaceId: string, document: Doc) => {
          try {
            const navigationNode: NavigationNode = {
              id: document.id,
              title: document.title,
              type: NavigationNodeType.Document,
              url: "",
              children: [],
              parent: null,
            };

            set(
              produce((state) => {
                const subspace = state.entities[subspaceId];
                if (!subspace) return;

                if (document.parentId) {
                  const findAndAddToParent = (nodes: NavigationNode[]): boolean => {
                    for (const node of nodes) {
                      if (node.id === document.parentId) {
                        node.children = [navigationNode, ...(node.children || [])];
                        navigationNode.parent = node;
                        return true;
                      }
                      if (node.children && findAndAddToParent(node.children)) {
                        return true;
                      }
                    }
                    return false;
                  };

                  if (!subspace.navigationTree) {
                    subspace.navigationTree = [];
                  }
                  findAndAddToParent(subspace.navigationTree);
                } else {
                  subspace.navigationTree = [navigationNode, ...(subspace.navigationTree || [])];
                }
              }),
            );
          } catch (error) {
            console.error("Failed to add document to subspace:", error);
            throw error;
          }
        },

        updateDocument: (subspaceId: string, documentId: string, updates: Partial<Doc>) => {
          // Update the document
          get().updateDeep(subspaceId, `navigationTree.${documentId}`, (doc: Doc) => ({
            ...doc,
            ...updates,
          }));

          // Update navigation tree
          const subspace = get().entities[subspaceId];
          if (subspace?.navigationTree) {
            const updateNodeInTree = (nodes: NavigationNode[]): boolean => {
              for (const node of nodes) {
                if (node.id === documentId) {
                  Object.assign(node, {
                    title: updates.title || node.title,
                    type: updates.type ? (updates.type as NavigationNodeType) : node.type,
                    // path: updates.path || node.path,
                  });
                  return true;
                }
                if (node.children && updateNodeInTree(node.children)) {
                  return true;
                }
              }
              return false;
            };
            updateNodeInTree(subspace.navigationTree);
          }
        },

        removeDocument: (subspaceId: string, documentId: string) => {
          // Remove the document
          get().updateDeep(subspaceId, "navigationTree", (docs: Record<string, Doc> = {}) => {
            const { [documentId]: _, ...rest } = docs;
            return rest;
          });

          // Update navigation tree
          const subspace = get().entities[subspaceId];
          if (subspace?.navigationTree) {
            const removeFromTree = (nodes: NavigationNode[]): boolean => {
              for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                if (node.id === documentId) {
                  nodes.splice(i, 1);
                  return true;
                }
                if (node.children && removeFromTree(node.children)) {
                  return true;
                }
              }
              return false;
            };
            removeFromTree(subspace.navigationTree);
          }
        },

        // Navigation Tree
        fetchNavigationTree: async (subspaceId, options = {}) => {
          const { isLoading, entities } = get();
          const subspace = entities[subspaceId];

          // TODO: determine which subspace should load when user enter the page
          // if (!subspace || isLoading) return;

          if (subspace.navigationTree[subspaceId] && !options?.force) return;

          set({ isLoading: true });
          try {
            const res = await subspaceApi.fetchNavigationTree(subspaceId);
            get().updateDeep(subspaceId, `navigationTree`, res);
          } finally {
            set({ isLoading: false });
          }
        },

        getPathToDocument: (subspaceId: string, documentId: string): NavigationNode[] => {
          const subspace = get().entities[subspaceId];
          if (!subspace?.navigationTree) return [];

          let path: NavigationNode[] = [];

          const findPath = (nodes: NavigationNode[], targetId: string, currentPath: NavigationNode[]): boolean => {
            for (const node of nodes) {
              const newPath = [...currentPath, node];

              if (node.id === targetId) {
                path = newPath;
                return true;
              }

              if (node.children && findPath(node.children, targetId, newPath)) {
                return true;
              }
            }
            return false;
          };

          findPath(subspace.navigationTree, documentId, []);
          return path;
        },

        containsDocument: (subspaceId: string, documentId: string): boolean => {
          const path = get().getPathToDocument(subspaceId, documentId);
          return path.length > 0;
        },

        getExpandedKeysForDocument: (subspaceId: string, documentId: string): string[] => {
          const path = get().getPathToDocument(subspaceId, documentId);
          return path.slice(0, -1).map((node) => node.id); // 排除文档本身，只返回父节点
        },

        // UI State
        setActiveSubspace: (id) => {
          set({ activeSubspaceId: id });
        },
      })),
      {
        name: "subspaceStore",
      },
    ),
  ),
);

export default useSubSpaceStore;
