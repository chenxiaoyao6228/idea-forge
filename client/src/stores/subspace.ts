import { create } from "zustand";
import { subspaceApi } from "@/apis/subspace";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import { Doc, NavigationNode, NavigationNodeType } from "contracts";
import createEntitySlice, { EntityState } from "./utils/entity-slice";
import { produce } from "immer";
import useStarStore from "./star";

export interface SubspaceEntity {
  id: string;
  name: string;
  avatar?: string | null;
  workspaceId: string;
  type: string;
  index: string;
  navigationTree: NavigationNode[];
  url?: string;
  updatedAt: Date;
  createdAt: Date;
}

interface State {
  isLoading: boolean;
  isLoaded: boolean;
  activeSubspaceId?: string;
}

interface Action {
  // api actions
  fetchList: (workspaceId?: string) => Promise<SubspaceEntity[]>;
  create: (payload: {
    name: string;
    description: string;
    avatar?: string;
    type: string;
    workspaceId: string;
  }) => Promise<SubspaceEntity>;
  // FIXME: Doc type here
  addDocument: (subspaceId: string, document: Doc) => void;
  updateDocument: (subspaceId: string, documentId: string, updates: Partial<Doc>) => void;
  removeDocument: (subspaceId: string, documentId: string) => void;
  fetchNavigationTree: (subspaceId: string, options?: { force?: boolean }) => Promise<void>;
  asNavigationTree: (subspaceId: string) => NavigationNode;
  getPathToDocument: (subspaceId: string, documentId: string) => NavigationNode[];
  containsDocument: (subspaceId: string, documentId: string) => boolean;
  getExpandedKeysForDocument: (subspaceId: string, documentId: string) => string[];
  setActiveSubspace: (id?: string) => void;
  move: (subspaceId: string, index: string) => Promise<void>;
  // Add method to check if subspace needs update
  needsUpdate: (subspaceId: string, updatedAt: Date) => boolean;
  // Add method to update subspace directly
  updateSubspace: (subspace: SubspaceEntity) => void;
  handleSubspaceUpdate: (subspaceId: string, updatedAt?: string) => Promise<void>;
  refreshNavigationTree: (subspaceId: string) => Promise<void>;
  star: (subspace: SubspaceEntity, index?: string) => Promise<void>;
  unStar: (subspace: SubspaceEntity) => Promise<void>;
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
        allSubspaces: subspaceSelectors.selectAll(state).sort((a, b) => {
          return a.index < b.index ? -1 : 1;
        }),
        allSubspacesAsNavigationNodes: subspaceSelectors.selectAll(state).map((subspace) => ({
          type: NavigationNodeType.Subspace,
          id: subspace.id,
          title: subspace.name,
          createdAt: subspace.createdAt,
          updatedAt: subspace.updatedAt,
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
        fetchList: async (workspaceId?: string) => {
          set({ isLoading: true });
          try {
            const response = (await subspaceApi.getSubspaces(workspaceId)) as any;
            const subspaces = response.map((subspace) => ({
              ...subspace,
              index: subspace.index || 0,
              navigationTree: subspace.navigationTree ?? [],
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

            // Add the new subspace to the store immediately
            get().addOne({
              id: response.id,
              name: response.name,
              avatar: response.avatar,
              workspaceId: response.workspaceId,
              type: response.type,
              index: response.index || 0,
              navigationTree: [],
              updatedAt: new Date(response.updatedAt),
              createdAt: new Date(response.createdAt),
            });

            return response;
          } catch (error) {
            console.error("Failed to create subspace:", error);
            throw error;
          }
        },

        // Add method to update subspace directly
        updateSubspace: (subspace: SubspaceEntity) => {
          const existing = get().entities[subspace.id];
          if (!existing || new Date(existing.updatedAt) < new Date(subspace.updatedAt)) {
            get().updateOne({
              id: subspace.id,
              changes: {
                ...subspace,
                updatedAt: new Date(subspace.updatedAt),
                createdAt: new Date(subspace.createdAt),
              },
            });
          }
        },

        // Document operations with navigation tree support
        addDocument: (subspaceId, document) => {
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
          console.log("updateDocument, updates", updates);

          set(
            produce((state) => {
              const subspace = state.entities[subspaceId];
              if (!subspace?.navigationTree) return;

              const updateNodeInTree = (nodes: NavigationNode[]): boolean => {
                for (const node of nodes) {
                  if (node.id === documentId) {
                    node.title = updates.title || node.title;
                    node.type = updates.type ? (updates.type as NavigationNodeType) : node.type;
                    return true;
                  }
                  if (node.children && updateNodeInTree(node.children)) {
                    return true;
                  }
                }
                return false;
              };

              updateNodeInTree(subspace.navigationTree);
            }),
          );
        },

        removeDocument: (subspaceId: string, documentId: string) => {
          set(
            produce((state) => {
              const subspace = state.entities[subspaceId];
              if (!subspace?.navigationTree) return;

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
            }),
          );
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

        move: async (subspaceId: string, index: string) => {
          try {
            const response = await subspaceApi.moveSubspace(subspaceId, { index });

            // if (response) {
            //   const subspace = get().entities[subspaceId];
            //   if (subspace) {
            //     get().updateOne({
            //       id: subspaceId,
            //       changes: { index: response.index },
            //     });
            //   }
            // }
          } catch (error) {
            console.error("Failed to move subspace:", error);
            throw error;
          }
        },

        handleSubspaceUpdate: async (subspaceId: string, updatedAt?: string) => {
          const existing = get().entities[subspaceId];

          // Check if update is needed
          if (existing && updatedAt && new Date(existing.updatedAt).getTime() === new Date(updatedAt).getTime()) {
            return;
          }

          try {
            // Refresh navigation tree
            await get().fetchNavigationTree(subspaceId, { force: true });
          } catch (error: any) {
            console.error(`Failed to update subspace ${subspaceId}:`, error);
            if (error.status === 404 || error.status === 403) {
              get().removeOne(subspaceId);
            }
          }
        },

        refreshNavigationTree: async (subspaceId: string) => {
          await get().fetchNavigationTree(subspaceId, { force: true });
        },

        // 改进 needsUpdate 方法
        needsUpdate: (subspaceId: string, updatedAt: Date) => {
          const existing = get().entities[subspaceId];
          if (!existing) return true;

          const existingDate = new Date(existing.updatedAt);
          return existingDate < updatedAt;
        },

        // UI State
        setActiveSubspace: (id) => {
          set({ activeSubspaceId: id });
        },

        star: async (subspace: SubspaceEntity, index?: string) => {
          try {
            await useStarStore.getState().create({
              subspaceId: subspace.id,
              index,
            });
          } catch (error) {
            console.error("Failed to star subspace:", error);
            throw error;
          }
        },

        unStar: async (subspace: SubspaceEntity) => {
          try {
            const star = useStarStore.getState().getStarByTarget(undefined, subspace.id);
            if (star) {
              await useStarStore.getState().remove(star.id);
            }
          } catch (error) {
            console.error("Failed to unStar subspace:", error);
            throw error;
          }
        },
      })),
      {
        name: "subspaceStore",
      },
    ),
  ),
);

export default useSubSpaceStore;
