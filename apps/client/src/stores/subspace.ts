import { create } from "zustand";
import { subspaceApi } from "@/apis/subspace";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import { CreateSubspaceRequest, NavigationNode, NavigationNodeType } from "@idea/contracts";
import createEntitySlice, { EntityState } from "./utils/entity-slice";
import { produce } from "immer";
import useStarStore from "./star";
import { EntityActions } from "./utils/entity-slice";
import { DocumentEntity } from "./document";

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
  //  fields
  description?: string;
  isPrivate?: boolean;
  documentCount?: number;
  memberCount?: number;
}

interface State {
  isLoading: boolean;
  isLoaded: boolean;
  activeSubspaceId?: string;
  //  state
  isCreating: boolean;
  isUpdating: boolean;
  expandedKeys: Set<string>; // Track expanded tree nodes
}

interface Action {
  // Existing API actions
  fetchList: (workspaceId: string) => Promise<SubspaceEntity[]>;
  create: (payload: CreateSubspaceRequest) => Promise<SubspaceEntity>;
  move: (subspaceId: string, index: string) => Promise<void>;
  update: (subspaceId: string, updates: Partial<SubspaceEntity>) => Promise<void>;
  delete: (subspaceId: string, options?: { permanent?: boolean }) => Promise<void>;
  duplicate: (subspaceId: string, newName?: string) => Promise<SubspaceEntity>;
  export: (subspaceId: string, format?: "markdown" | "html" | "pdf") => Promise<void>;

  //  document structure management
  addDocumentToStructure: (subspaceId: string, document: DocumentEntity, index?: number) => void;
  removeDocumentFromStructure: (subspaceId: string, documentId: string) => void;
  updateDocumentInStructure: (subspaceId: string, documentId: string, updates: Partial<DocumentEntity>) => void;
  moveDocumentInStructure: (subspaceId: string, documentId: string, newIndex: number, newParentId?: string | null) => void;
  reorderDocuments: (subspaceId: string, documentIds: string[]) => void;

  //  navigation tree operations
  expandNode: (subspaceId: string, nodeId: string) => void;
  collapseNode: (subspaceId: string, nodeId: string) => void;
  expandAll: (subspaceId: string) => void;
  collapseAll: (subspaceId: string) => void;
  getExpandedKeys: (subspaceId: string) => string[];
  setExpandedKeys: (subspaceId: string, keys: string[]) => void;

  //  collection-like queries
  getDocumentCount: (subspaceId: string) => number;
  getPublishedCount: (subspaceId: string) => number;
  getDraftCount: (subspaceId: string) => number;
  getArchivedCount: (subspaceId: string) => number;
  getDocumentsByType: (subspaceId: string, type: string) => DocumentEntity[];
  getDocumentsByAuthor: (subspaceId: string, authorId: string) => DocumentEntity[];
  getRecentlyUpdated: (subspaceId: string, limit?: number) => DocumentEntity[];

  // Existing helper methods
  star: (subspaceId: string, index?: string) => Promise<void>;
  unStar: (subspaceId: string) => Promise<void>;
  addDocument: (subspaceId: string, document: DocumentEntity) => void;
  updateDocument: (subspaceId: string, documentId: string, updates: Partial<DocumentEntity>) => void;
  removeDocument: (subspaceId: string, documentId: string) => void;
  fetchNavigationTree: (subspaceId: string, options?: { force?: boolean }) => Promise<void>;
  asNavigationTree: (subspaceId: string) => NavigationNode;
  getPathToDocument: (subspaceId: string, documentId: string) => NavigationNode[];
  containsDocument: (subspaceId: string, documentId: string) => boolean;
  getExpandedKeysForDocument: (subspaceId: string, documentId: string) => string[];
  setActiveSubspace: (id?: string) => void;
  needsUpdate: (subspaceId: string, updatedAt: Date) => boolean;
  updateSubspace: (subspace: SubspaceEntity) => void;
  handleSubspaceUpdate: (subspaceId: string, updatedAt?: string) => Promise<void>;
  refreshNavigationTree: (subspaceId: string) => Promise<void>;
}

const defaultState: State = {
  isLoading: false,
  isLoaded: false,
  activeSubspaceId: undefined,
  isCreating: false,
  isUpdating: false,
  expandedKeys: new Set(),
};

const subspaceEntitySlice = createEntitySlice<SubspaceEntity>();
export const subspaceSelectors = subspaceEntitySlice.selectors;

type StoreState = State & Action & EntityState<SubspaceEntity> & EntityActions<SubspaceEntity>;

const useSubSpaceStore = create<StoreState>()(
  subscribeWithSelector(
    devtools(
      createComputed((state: StoreState) => ({
        allSubspaces: subspaceSelectors
          .selectAll(state)
          .sort((a, b) => {
            return a.index < b.index ? -1 : 1;
          })
          .filter((subspace) => subspace.type !== "PERSONAL"),
        personalSubspace: subspaceSelectors.selectAll(state).find((subspace) => subspace.type === "PERSONAL"),
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
        // computed properties
        activeSubspace: state.activeSubspaceId ? state.entities[state.activeSubspaceId] : undefined,
        isExpanded: (subspaceId: string, nodeId: string) => state.expandedKeys.has(`${subspaceId}:${nodeId}`),
      }))((set, get) => ({
        ...defaultState,
        ...subspaceEntitySlice.initialState,
        ...subspaceEntitySlice.createActions(set),

        asNavigationTree: (subspaceId) => {
          const subspace = subspaceSelectors.selectById(get(), subspaceId);
          if (!subspace) return {} as NavigationNode;
          return {
            id: subspace.id,
            title: subspace.name,
            type: NavigationNodeType.Subspace,
            url: "",
            children: subspace.navigationTree ?? [],
            parent: null,
          } as NavigationNode;
        },

        // document structure management
        addDocumentToStructure: (subspaceId, document, index = 0) => {
          try {
            const navigationNode: NavigationNode = convertDocEntityToNavigationNode(document);

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
                  // Insert at specific index or append to end
                  if (!subspace.navigationTree) {
                    subspace.navigationTree = [];
                  }
                  if (index >= 0 && index < subspace.navigationTree.length) {
                    subspace.navigationTree.splice(index, 0, navigationNode);
                  } else {
                    subspace.navigationTree.push(navigationNode);
                  }
                }
              }),
            );
          } catch (error) {
            console.error("Failed to add document to subspace structure:", error);
            throw error;
          }
        },

        removeDocumentFromStructure: (subspaceId, documentId) => {
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

        updateDocumentInStructure: (subspaceId, documentId, updates) => {
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

        moveDocumentInStructure: (subspaceId, documentId, newIndex, newParentId) => {
          set(
            produce((state) => {
              const subspace = state.entities[subspaceId];
              if (!subspace?.navigationTree) return;

              // Find and remove the node from its current position
              let nodeToMove: NavigationNode | null = null;
              const removeFromTree = (nodes: NavigationNode[]): boolean => {
                for (let i = 0; i < nodes.length; i++) {
                  const node = nodes[i];
                  if (node.id === documentId) {
                    nodeToMove = nodes.splice(i, 1)[0];
                    return true;
                  }
                  if (node.children && removeFromTree(node.children)) {
                    return true;
                  }
                }
                return false;
              };

              removeFromTree(subspace.navigationTree);

              if (!nodeToMove) return;

              // Add to new position
              if (newParentId) {
                const findAndAddToParent = (nodes: NavigationNode[]): boolean => {
                  for (const node of nodes) {
                    if (node.id === newParentId) {
                      if (!node.children) node.children = [];
                      if (newIndex >= 0 && newIndex < node.children.length) {
                        node.children.splice(newIndex, 0, nodeToMove!);
                      } else {
                        node.children.push(nodeToMove!);
                      }
                      (nodeToMove as any).parent = node;
                      return true;
                    }
                    if (node.children && findAndAddToParent(node.children)) {
                      return true;
                    }
                  }
                  return false;
                };

                findAndAddToParent(subspace.navigationTree);
              } else {
                // Add to root level
                if (newIndex >= 0 && newIndex < subspace.navigationTree.length) {
                  subspace.navigationTree.splice(newIndex, 0, nodeToMove);
                } else {
                  subspace.navigationTree.push(nodeToMove);
                }
                (nodeToMove as any).parent = null;
              }
            }),
          );
        },

        reorderDocuments: (subspaceId, documentIds) => {
          set(
            produce((state) => {
              const subspace = state.entities[subspaceId];
              if (!subspace?.navigationTree) return;

              // Create a map of nodes by ID
              const nodeMap = new Map<string, NavigationNode>();
              const collectNodes = (nodes: NavigationNode[]) => {
                nodes.forEach((node) => {
                  nodeMap.set(node.id, node);
                  if (node.children) collectNodes(node.children);
                });
              };
              collectNodes(subspace.navigationTree);

              // Reorder root level documents
              const reorderedNodes: NavigationNode[] = [];
              documentIds.forEach((id) => {
                const node = nodeMap.get(id);
                if (node && !node.parent) {
                  reorderedNodes.push(node);
                }
              });

              // Keep other root nodes
              subspace.navigationTree.forEach((node) => {
                if (!documentIds.includes(node.id)) {
                  reorderedNodes.push(node);
                }
              });

              subspace.navigationTree = reorderedNodes;
            }),
          );
        },

        //  navigation tree operations
        expandNode: (subspaceId, nodeId) => {
          set(
            produce((state) => {
              state.expandedKeys.add(`${subspaceId}:${nodeId}`);
            }),
          );
        },

        collapseNode: (subspaceId, nodeId) => {
          set(
            produce((state) => {
              state.expandedKeys.delete(`${subspaceId}:${nodeId}`);
            }),
          );
        },

        expandAll: (subspaceId) => {
          const subspace = get().entities[subspaceId];
          if (!subspace?.navigationTree) return;

          const collectNodeIds = (nodes: NavigationNode[]): string[] => {
            const ids: string[] = [];
            nodes.forEach((node) => {
              if (node.children && node.children.length > 0) {
                ids.push(node.id);
                ids.push(...collectNodeIds(node.children));
              }
            });
            return ids;
          };

          const nodeIds = collectNodeIds(subspace.navigationTree);
          set(
            produce((state) => {
              nodeIds.forEach((id) => {
                state.expandedKeys.add(`${subspaceId}:${id}`);
              });
            }),
          );
        },

        collapseAll: (subspaceId) => {
          set(
            produce((state) => {
              const keysToRemove: string[] = [];
              state.expandedKeys.forEach((key) => {
                if (key.startsWith(`${subspaceId}:`)) {
                  keysToRemove.push(key);
                }
              });
              keysToRemove.forEach((key) => state.expandedKeys.delete(key));
            }),
          );
        },

        getExpandedKeys: (subspaceId) => {
          const keys: string[] = [];
          get().expandedKeys.forEach((key) => {
            if (key.startsWith(`${subspaceId}:`)) {
              keys.push(key.replace(`${subspaceId}:`, ""));
            }
          });
          return keys;
        },

        setExpandedKeys: (subspaceId, keys) => {
          set(
            produce((state) => {
              // Remove existing keys for this subspace
              const keysToRemove: string[] = [];
              state.expandedKeys.forEach((key) => {
                if (key.startsWith(`${subspaceId}:`)) {
                  keysToRemove.push(key);
                }
              });
              keysToRemove.forEach((key) => state.expandedKeys.delete(key));

              // Add new keys
              keys.forEach((key) => {
                state.expandedKeys.add(`${subspaceId}:${key}`);
              });
            }),
          );
        },

        getDocumentCount: (subspaceId) => {
          const subspace = get().entities[subspaceId];
          if (!subspace?.navigationTree) return 0;

          const countNodes = (nodes: NavigationNode[]): number => {
            return nodes.reduce((count, node) => {
              return count + 1 + (node.children ? countNodes(node.children) : 0);
            }, 0);
          };

          return countNodes(subspace.navigationTree);
        },

        getPublishedCount: (subspaceId) => {
          // This would need to be implemented with actual document data
          // For now, return a placeholder
          return get().getDocumentCount(subspaceId);
        },

        getDraftCount: (subspaceId) => {
          // This would need to be implemented with actual document data
          return 0;
        },

        getArchivedCount: (subspaceId) => {
          // This would need to be implemented with actual document data
          return 0;
        },

        getDocumentsByType: (subspaceId, type) => {
          // This would need to be implemented with actual document data
          return [];
        },

        getDocumentsByAuthor: (subspaceId, authorId) => {
          // This would need to be implemented with actual document data
          return [];
        },

        getRecentlyUpdated: (subspaceId, limit = 10) => {
          // This would need to be implemented with actual document data
          return [];
        },

        // API Actions
        fetchList: async (workspaceId) => {
          set({ isLoading: true });
          try {
            let subspaces: any[] = [];

            subspaces = await subspaceApi.getUserSubspacesIncludingVirtual(workspaceId);

            subspaces = subspaces.map((subspace) => ({
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
          set({ isCreating: true });
          try {
            const response = await subspaceApi.createSubspace(payload);
            const subspace: SubspaceEntity = {
              id: response.id,
              name: response.name,
              avatar: response.avatar,
              workspaceId: response.workspaceId,
              type: response.type,
              index: String(response.index || 0),
              navigationTree: [],
              updatedAt: new Date(response.updatedAt),
              createdAt: new Date(response.createdAt),
            };

            get().addOne(subspace);
            return subspace;
          } catch (error) {
            console.error("Failed to create subspace:", error);
            throw error;
          } finally {
            set({ isCreating: false });
          }
        },

        update: async (subspaceId, updates) => {
          set({ isUpdating: true });
          try {
            // Only pass valid fields to the API
            const { name, description, avatar } = updates;
            const response = await subspaceApi.updateSubspace(subspaceId, { name, description, avatar });
            get().updateOne({
              id: subspaceId,
              changes: {
                ...updates,
                updatedAt: new Date(),
              },
            });
          } catch (error) {
            console.error("Failed to update subspace:", error);
            throw error;
          } finally {
            set({ isUpdating: false });
          }
        },

        delete: async (subspaceId, options = { permanent: false }) => {
          try {
            if (options.permanent) {
              await subspaceApi.deleteSubspace(subspaceId);
              get().removeOne(subspaceId);
            } else {
              // Soft delete - just remove from store for now
              get().removeOne(subspaceId);
            }
          } catch (error) {
            console.error("Failed to delete subspace:", error);
            throw error;
          }
        },

        duplicate: async (subspaceId, newName) => {
          const original = get().entities[subspaceId];
          if (!original) throw new Error("Subspace not found");

          const duplicatePayload = {
            name: newName || `${original.name} (Copy)`,
            workspaceId: original.workspaceId,
            type: original.type as any, // Type assertion to handle string type
            description: original.description,
          };

          return await get().create(duplicatePayload);
        },

        export: async (subspaceId, format = "markdown") => {
          // This would need to be implemented with actual export logic
          console.log(`Exporting subspace ${subspaceId} as ${format}`);
        },

        updateSubspace: (subspace) => {
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

        addDocument: (subspaceId, document) => {
          try {
            const navigationNode: NavigationNode = convertDocEntityToNavigationNode(document);

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

        updateDocument: (subspaceId, documentId, updates) => {
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

        removeDocument: (subspaceId, documentId) => {
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

        fetchNavigationTree: async (subspaceId, options = {}) => {
          const { isLoading, entities } = get();
          const subspace = entities[subspaceId];

          if (subspace.navigationTree?.[subspaceId] && !options?.force) return;

          set({ isLoading: true });
          try {
            const res = await subspaceApi.fetchNavigationTree(subspaceId);
            get().updateDeep(subspaceId, `navigationTree`, res);
          } finally {
            set({ isLoading: false });
          }
        },

        getPathToDocument: (subspaceId, documentId) => {
          const subspace = get().entities[subspaceId];
          if (!subspace?.navigationTree) return [];

          let path: NavigationNode[] = [];

          const findPath = (nodes: NavigationNode[], targetId: string, currentPath: NavigationNode[]): boolean => {
            for (const node of nodes) {
              console.log("node", node);
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

        containsDocument: (subspaceId, documentId) => {
          const path = get().getPathToDocument(subspaceId, documentId);
          return path.length > 0;
        },

        getExpandedKeysForDocument: (subspaceId, documentId) => {
          const path = get().getPathToDocument(subspaceId, documentId);
          return path.slice(0, -1).map((node) => node.id);
        },

        move: async (subspaceId, index) => {
          try {
            const response = await subspaceApi.moveSubspace(subspaceId, { index });
          } catch (error) {
            console.error("Failed to move subspace:", error);
            throw error;
          }
        },

        handleSubspaceUpdate: async (subspaceId, updatedAt) => {
          const existing = get().entities[subspaceId];

          if (existing && updatedAt && new Date(existing.updatedAt).getTime() === new Date(updatedAt).getTime()) {
            return;
          }

          try {
            await get().fetchNavigationTree(subspaceId, { force: true });
          } catch (error: any) {
            console.error(`Failed to update subspace ${subspaceId}:`, error);
            if (error.status === 404 || error.status === 403) {
              get().removeOne(subspaceId);
            }
          }
        },

        refreshNavigationTree: async (subspaceId) => {
          await get().fetchNavigationTree(subspaceId, { force: true });
        },

        needsUpdate: (subspaceId, updatedAt) => {
          const existing = get().entities[subspaceId];
          if (!existing) return true;

          const existingDate = new Date(existing.updatedAt);
          return existingDate < updatedAt;
        },

        setActiveSubspace: (id) => {
          set({ activeSubspaceId: id });
        },

        star: async (subspaceId, index?) => {
          try {
            await useStarStore.getState().create({
              subspaceId,
              index,
            });
          } catch (error) {
            console.error("Failed to star subspace:", error);
            throw error;
          }
        },

        unStar: async (subspaceId) => {
          try {
            const star = useStarStore.getState().getStarByTarget(undefined, subspaceId);
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

function convertDocEntityToNavigationNode(doc: DocumentEntity): NavigationNode {
  return {
    id: doc.id,
    title: doc.title,
    type: NavigationNodeType.Document,
    url: "",
    children: [],
    parent: null,
  };
}

export const getPersonalSubspace = (state: StoreState) => subspaceSelectors.selectAll(state).find((s) => (s as any).type === "PERSONAL");
