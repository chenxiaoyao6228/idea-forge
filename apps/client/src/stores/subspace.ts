import { create } from "zustand";
import { subspaceApi } from "@/apis/subspace";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import {
  CreateSubspaceRequest,
  NavigationNode,
  NavigationNodeType,
  SubspaceMember,
  SubspaceSettingsResponse,
  UpdateSubspaceSettingsRequest,
} from "@idea/contracts";
import createEntitySlice, { EntityState } from "./utils/entity-slice";
import { produce } from "immer";
import { EntityActions } from "./utils/entity-slice";
import { DocumentEntity } from "./document";
import useUserStore from "./user-store";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import useRequest from "@ahooksjs/use-request";
import { useMemo } from "react";

const STORE_NAME = "subspaceStore";

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
  archivedAt?: Date | null;
  //  field
  description?: string;
  isPrivate?: boolean;
  documentCount?: number;
  members?: Array<
    SubspaceMember & {
      userId: string;
      user: {
        id: string;
        email: string;
        displayName: string | null;
        imageUrl: string | null;
      };
    }
  >;
  memberCount?: number;
}

interface State {
  isLoading: boolean;
  isLoaded: boolean;
  activeSubspaceId?: string;
  //  state
  isCreating: boolean;
  // Settings state
  subspaceSettings: SubspaceSettingsResponse | null;
  isSettingsLoading: boolean;
  isUpdating: boolean;
  expandedKeys: Set<string>; // Track expanded tree nodes
}

interface Action {
  // Existing API actions
  fetchList: (workspaceId: string) => Promise<SubspaceEntity[]>;
  fetchSubspace: (subspaceId: string) => Promise<SubspaceEntity>;
  create: (payload: CreateSubspaceRequest) => Promise<SubspaceEntity>;
  move: (subspaceId: string, index: string) => Promise<void>;
  update: (subspaceId: string, updates: Partial<SubspaceEntity>) => Promise<void>;
  delete: (subspaceId: string, options?: { permanent?: boolean }) => Promise<void>;
  duplicate: (subspaceId: string, newName?: string) => Promise<SubspaceEntity>;

  // Member management actions
  batchRemoveSubspaceMembers: (subspaceId: string, memberIds: string[]) => Promise<any>;

  // Settings management actions
  fetchSubspaceSettings: (subspaceId: string) => Promise<SubspaceSettingsResponse>;
  updateSubspaceSettings: (subspaceId: string, settings: UpdateSubspaceSettingsRequest) => Promise<SubspaceSettingsResponse>;
  clearSubspaceSettings: () => void;

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

  // Existing helper methods
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
  refreshSubspaceMembers: (subspaceId: string) => Promise<void>;
  joinSubspace: (subspaceId: string) => Promise<void>;

  // Navigation node finding methods for star functionality
  findNavigationNodeInTree: (nodes: NavigationNode[], targetId: string) => NavigationNode | null;
  findNavigationNodeInSubspace: (subspaceId: string, documentId: string) => NavigationNode | null;
  findNavigationNodeInPersonalSubspace: (documentId: string) => NavigationNode | null;
}

const defaultState: State = {
  isLoading: false,
  isLoaded: false,
  activeSubspaceId: undefined,
  isCreating: false,
  isUpdating: false,
  expandedKeys: new Set(),
  // Settings state
  subspaceSettings: null,
  isSettingsLoading: false,
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
        joinedSubspaces: subspaceSelectors
          .selectAll(state)
          .sort((a, b) => {
            return a.index < b.index ? -1 : 1;
          })
          .filter((subspace) => subspace?.members?.some((member) => member?.userId === useUserStore.getState().userInfo?.id))
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

        // API Actions
        fetchList: async (workspaceId) => {
          set({ isLoading: true });
          try {
            let subspaces: any[] = [];

            subspaces = await subspaceApi.getUserSubspacesIncludingPersonal(workspaceId);

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

        fetchSubspace: async (subspaceId) => {
          try {
            // TODO: FIX type error
            const response = (await subspaceApi.getSubspace(subspaceId)) as any;
            const subspace: SubspaceEntity = {
              ...response.subspace,
              index: response.subspace.index || "0",
              navigationTree: response.subspace.navigationTree as NavigationNode[],
              members: response.subspace.members || [],
              memberCount: response.subspace.memberCount || 0,
              updatedAt: new Date(response.subspace.updatedAt),
              createdAt: new Date(response.subspace.createdAt),
            };

            get().upsertOne(subspace);

            return subspace;
          } catch (error) {
            console.error("Failed to fetch subspace:", error);
            throw error;
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

            // Refresh the subspace list to ensure we have the latest data from server
            // This is important for getting updated member counts, permissions, etc.
            try {
              await get().fetchList(payload.workspaceId);
            } catch (refreshError) {
              console.warn("Failed to refresh subspace list after creation:", refreshError);
              // Don't throw here as the creation was successful
            }

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

        joinSubspace: async (subspaceId) => {
          try {
            await subspaceApi.joinSubspace(subspaceId);
          } catch (error) {
            console.error("Failed to join subspace:", error);
            throw error;
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

        refreshSubspaceMembers: async (subspaceId: string) => {
          try {
            // Fetch updated member list from API
            const response = await subspaceApi.getSubspaceMembers(subspaceId);

            const updatedMembers = response.members.map((member) => ({
              ...member,
              user: {
                ...member.user,
                imageUrl: member.user.imageUrl || "",
              },
            }));

            // Update store with new member list
            get().updateOne({
              id: subspaceId,
              changes: {
                members: updatedMembers,
                memberCount: response.members.length,
              },
            });

            // Also update subspaceSettings if it exists and matches the current subspace
            const currentSettings = get().subspaceSettings;
            if (currentSettings && currentSettings.subspace.id === subspaceId) {
              set({
                subspaceSettings: {
                  ...currentSettings,
                  subspace: {
                    ...currentSettings.subspace,
                    members: updatedMembers,
                    memberCount: response.members.length,
                  },
                },
              });
            }
          } catch (error) {
            console.error("Failed to refresh subspace members:", error);
          }
        },

        batchRemoveSubspaceMembers: async (subspaceId: string, memberIds: string[]) => {
          try {
            const response = await subspaceApi.batchRemoveSubspaceMembers(subspaceId, memberIds);

            // Note: No manual refresh needed here - websocket events will handle the refresh automatically
            // The SUBSPACE_MEMBER_LEFT events will trigger refreshSubspaceMembers()

            return response;
          } catch (error) {
            console.error("Failed to batch remove subspace members:", error);
            throw error;
          }
        },

        // Settings management actions
        fetchSubspaceSettings: async (subspaceId: string) => {
          set({ isSettingsLoading: true });
          try {
            const response = await subspaceApi.getSubspaceSettings(subspaceId);
            set({ subspaceSettings: response });
            return response;
          } catch (error) {
            console.error("Failed to fetch subspace settings:", error);
            throw error;
          } finally {
            set({ isSettingsLoading: false });
          }
        },

        updateSubspaceSettings: async (subspaceId: string, settings: UpdateSubspaceSettingsRequest) => {
          set({ isUpdating: true });
          try {
            const response = await subspaceApi.updateSubspaceSettings(subspaceId, settings);
            set({ subspaceSettings: response });

            // Also update the subspace entity in the store
            const currentSubspace = get().entities[subspaceId];
            if (currentSubspace) {
              get().updateOne({
                id: subspaceId,
                changes: {
                  ...currentSubspace,
                  name: response.subspace.name,
                  description: response.subspace.description || undefined,
                  avatar: response.subspace.avatar,
                  type: response.subspace.type,
                },
              });
            }

            return response;
          } catch (error) {
            console.error("Failed to update subspace settings:", error);
            throw error;
          } finally {
            set({ isUpdating: false });
          }
        },

        clearSubspaceSettings: () => {
          set({ subspaceSettings: null });
        },

        // Navigation node finding methods for star functionality
        findNavigationNodeInTree: (nodes: NavigationNode[], targetId: string) => {
          for (const node of nodes) {
            if (node.id === targetId) {
              return node;
            }
            if (node.children && node.children.length > 0) {
              const found = get().findNavigationNodeInTree(node.children, targetId);
              if (found) return found;
            }
          }
          return null;
        },

        findNavigationNodeInSubspace: (subspaceId: string, documentId: string) => {
          const subspace = get().entities[subspaceId];
          if (!subspace?.navigationTree) return null;
          return get().findNavigationNodeInTree(subspace.navigationTree, documentId);
        },

        findNavigationNodeInPersonalSubspace: (documentId: string) => {
          const personalSubspace = getPersonalSubspace(get());
          if (!personalSubspace?.navigationTree) return null;
          return get().findNavigationNodeInTree(personalSubspace.navigationTree, documentId);
        },
      })),
      {
        name: STORE_NAME,
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

// Custom hook to check if current user is the only admin in a subspace
export const useIsLastSubspaceAdmin = (subspaceId: string) => {
  const subspace = useSubSpaceStore((state) => subspaceSelectors.selectById(state, subspaceId));
  const { userInfo } = useUserStore();

  return useMemo(() => {
    if (!userInfo?.id || !subspace?.members) {
      return false;
    }

    const admins = subspace.members.filter((member) => member.role === "ADMIN");
    const currentUserIsAdmin = admins.some((admin) => admin.userId === userInfo.id);
    return currentUserIsAdmin && admins.length === 1;
  }, [userInfo?.id, subspace?.members]);
};

// Custom hook for batch adding subspace members with toast handling
export const useBatchAddSubspaceMembers = () => {
  const { t } = useTranslation();

  return useRequest(
    async (params: {
      subspaceId: string;
      items: Array<{ id: string; type: "user" | "group"; role: "MEMBER" | "ADMIN" }>;
    }) => {
      try {
        const response = await subspaceApi.batchAddSubspaceMembers(params.subspaceId, { items: params.items });
        const result = response;

        // Handle success toasts
        if (result.addedCount > 0) {
          toast.success(t("Successfully added {{count}} member(s)", { count: result.addedCount }));
        }

        if (result.skipped && result.skipped.length > 0) {
          const skippedMessages = result.skipped.map((item: any) => `${item.type === "user" ? "User" : "Group"} ${item.id}: ${item.reason}`).join(", ");
          toast.info(
            t("Skipped {{count}} item(s) - {{reasons}}", {
              count: result.skipped.length,
              reasons: skippedMessages,
            }),
          );
        }

        if (result.errors && result.errors.length > 0) {
          const errorMessages = result.errors.map((error: any) => `${error.type === "user" ? "User" : "Group"} ${error.id}: ${error.error}`).join(", ");
          toast.error(t("Some items failed to add: {{errors}}", { errors: errorMessages }));
        }

        // If no members were added and no errors, show a message
        if (result.addedCount === 0 && (!result.errors || result.errors.length === 0)) {
          toast.info(t("All selected members are already part of this subspace"));
        }

        return result;
      } catch (error) {
        console.error("Failed to batch add subspace members:", error);
        toast.error(t("Failed to add members"));
        throw error;
      }
    },
    {
      manual: true,
    },
  );
};

// Custom hook for leaving subspace with toast handling
export const useLeaveSubspace = () => {
  const { t } = useTranslation();
  const removeOne = useSubSpaceStore((state) => state.removeOne);

  return useRequest(
    async (params: { subspaceId: string }) => {
      try {
        await subspaceApi.leaveSubspace(params.subspaceId);

        // Remove the subspace from the store after successful leave
        removeOne(params.subspaceId);

        // Show success toast
        toast.success(t("Successfully left the subspace"));

        return { success: true };
      } catch (error: any) {
        console.error("Failed to leave subspace:", error);

        // Handle specific error cases
        const code = error?.response?.data?.code || error?.code;
        if (code === "cannot_leave_as_last_admin") {
          toast.error(t("You cannot leave this subspace because you are the last admin. Please assign another admin before leaving."));
        } else {
          const errorMessage = error?.response?.data?.message || error?.message || t("Failed to leave subspace");
          toast.error(errorMessage);
        }

        // Re-throw the error for useRequest to handle
        throw error;
      }
    },
    {
      manual: true,
    },
  );
};
