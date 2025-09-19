import { create } from "zustand";
import { subspaceApi } from "@/apis/subspace";
import {
  CreateSubspaceRequest,
  NavigationNode,
  NavigationNodeType,
  SubspaceMember,
  SubspaceSettingsResponse,
  UpdateSubspaceSettingsRequest,
} from "@idea/contracts";
import { DocumentEntity } from "./document-store";
import useUserStore from "./user-store";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import useRequest from "@ahooksjs/use-request";
import { useMemo } from "react";
import { useRefCallback } from "@/hooks/use-ref-callback";

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

// Minimal Zustand store
const useSubSpaceStore = create<{
  subspaces: Record<string, SubspaceEntity>;
  activeSubspaceId?: string;
  expandedKeys: Set<string>;
  subspaceSettings: SubspaceSettingsResponse | null;
}>((set) => ({
  subspaces: {},
  activeSubspaceId: undefined,
  expandedKeys: new Set(),
  subspaceSettings: null,
}));

// Data Access Hooks
export const useSubspaces = () => useSubSpaceStore((state) => state.subspaces);
export const useActiveSubspaceId = () => useSubSpaceStore((state) => state.activeSubspaceId);
export const useExpandedKeys = () => useSubSpaceStore((state) => state.expandedKeys);
export const useSubspaceSettings = () => useSubSpaceStore((state) => state.subspaceSettings);

// Computed Value Hooks
export const useAllSubspaces = () => {
  return useMemo(() => {
    const subspaces = useSubSpaceStore.getState().subspaces;
    return Object.values(subspaces)
      .sort((a, b) => (a.index < b.index ? -1 : 1))
      .filter((subspace) => subspace.type !== "PERSONAL");
  }, [useSubSpaceStore((state) => state.subspaces)]);
};

export const useJoinedSubspaces = () => {
  return useMemo(() => {
    const subspaces = useSubSpaceStore.getState().subspaces;
    const userInfo = useUserStore.getState().userInfo;

    return Object.values(subspaces)
      .sort((a, b) => (a.index < b.index ? -1 : 1))
      .filter((subspace) => subspace?.members?.some((member) => member?.userId === userInfo?.id))
      .filter((subspace) => subspace.type !== "PERSONAL");
  }, [useSubSpaceStore((state) => state.subspaces), useUserStore((state) => state.userInfo)]);
};

export const usePersonalSubspace = () => {
  return useMemo(() => {
    const subspaces = useSubSpaceStore.getState().subspaces;
    return Object.values(subspaces).find((subspace) => subspace.type === "PERSONAL");
  }, [useSubSpaceStore((state) => state.subspaces)]);
};

export const useActiveSubspace = () => {
  return useMemo(() => {
    const activeSubspaceId = useSubSpaceStore.getState().activeSubspaceId;
    const subspaces = useSubSpaceStore.getState().subspaces;
    return activeSubspaceId ? subspaces[activeSubspaceId] : undefined;
  }, [useSubSpaceStore((state) => state.activeSubspaceId), useSubSpaceStore((state) => state.subspaces)]);
};

export const useSubspacesAsNavigationNodes = () => {
  return useMemo(() => {
    const subspaces = useSubSpaceStore.getState().subspaces;
    return Object.values(subspaces).map((subspace) => ({
      type: NavigationNodeType.Subspace,
      id: subspace.id,
      title: subspace.name,
      createdAt: subspace.createdAt,
      updatedAt: subspace.updatedAt,
      icon: subspace.avatar ?? undefined,
      url: subspace.url ?? `/subspace/${subspace.id}`,
      children: subspace.navigationTree ?? [],
    }));
  }, [useSubSpaceStore((state) => state.subspaces)]);
};

export const useSubspaceById = () => {
  return useRefCallback((subspaceId: string) => {
    return useSubSpaceStore.getState().subspaces[subspaceId];
  });
};

export const useSubspaceMembers = () => {
  return useRefCallback((subspaceId: string) => {
    const subspace = useSubSpaceStore.getState().subspaces[subspaceId];
    return subspace?.members || [];
  });
};

export const useSubspaceNavigationTree = () => {
  return useRefCallback((subspaceId: string) => {
    const subspace = useSubSpaceStore.getState().subspaces[subspaceId];
    return subspace?.navigationTree || [];
  });
};

export const useSubspaceDocumentCount = () => {
  return useRefCallback((subspaceId: string) => {
    const subspace = useSubSpaceStore.getState().subspaces[subspaceId];
    if (!subspace?.navigationTree) return 0;

    const countNodes = (nodes: NavigationNode[]): number => {
      return nodes.reduce((count, node) => {
        return count + 1 + (node.children ? countNodes(node.children) : 0);
      }, 0);
    };

    return countNodes(subspace.navigationTree);
  });
};

export const useExpandedKeysForSubspace = () => {
  return useRefCallback((subspaceId: string) => {
    const expandedKeys = useSubSpaceStore.getState().expandedKeys;
    const keys: string[] = [];
    expandedKeys.forEach((key) => {
      if (key.startsWith(`${subspaceId}:`)) {
        keys.push(key.replace(`${subspaceId}:`, ""));
      }
    });
    return keys;
  });
};

// Helper Function Hooks
export const useIsSubspaceExpanded = () => {
  return useRefCallback((subspaceId: string, nodeId: string) => {
    const expandedKeys = useSubSpaceStore.getState().expandedKeys;
    return expandedKeys.has(`${subspaceId}:${nodeId}`);
  });
};

export const useExpandNode = () => {
  return useRefCallback((subspaceId: string, nodeId: string) => {
    useSubSpaceStore.setState((state) => ({
      expandedKeys: new Set([...state.expandedKeys, `${subspaceId}:${nodeId}`]),
    }));
  });
};

export const useCollapseNode = () => {
  return useRefCallback((subspaceId: string, nodeId: string) => {
    useSubSpaceStore.setState((state) => {
      const newExpandedKeys = new Set(state.expandedKeys);
      newExpandedKeys.delete(`${subspaceId}:${nodeId}`);
      return { expandedKeys: newExpandedKeys };
    });
  });
};

export const useExpandAll = () => {
  return useRefCallback((subspaceId: string) => {
    const subspace = useSubSpaceStore.getState().subspaces[subspaceId];
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
    useSubSpaceStore.setState((state) => {
      const newExpandedKeys = new Set(state.expandedKeys);
      nodeIds.forEach((id) => {
        newExpandedKeys.add(`${subspaceId}:${id}`);
      });
      return { expandedKeys: newExpandedKeys };
    });
  });
};

export const useCollapseAll = () => {
  return useRefCallback((subspaceId: string) => {
    useSubSpaceStore.setState((state) => {
      const newExpandedKeys = new Set(state.expandedKeys);
      const keysToRemove: string[] = [];
      newExpandedKeys.forEach((key) => {
        if (key.startsWith(`${subspaceId}:`)) {
          keysToRemove.push(key);
        }
      });
      keysToRemove.forEach((key) => newExpandedKeys.delete(key));
      return { expandedKeys: newExpandedKeys };
    });
  });
};

export const useGetPathToDocument = () => {
  return useRefCallback((subspaceId: string, documentId: string) => {
    const subspace = useSubSpaceStore.getState().subspaces[subspaceId];
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
  });
};

export const useContainsDocument = () => {
  return useRefCallback((subspaceId: string, documentId: string) => {
    const getPathToDocument = useGetPathToDocument();
    const path = getPathToDocument(subspaceId, documentId);
    return path.length > 0;
  });
};

export const useGetExpandedKeysForDocument = () => {
  return useRefCallback((subspaceId: string, documentId: string) => {
    const getPathToDocument = useGetPathToDocument();
    const path = getPathToDocument(subspaceId, documentId);
    return path.slice(0, -1).map((node) => node.id);
  });
};

export const useFindNavigationNodeInSubspace = () => {
  return useRefCallback((subspaceId: string, documentId: string) => {
    const subspace = useSubSpaceStore.getState().subspaces[subspaceId];
    if (!subspace?.navigationTree) return null;

    const findNavigationNodeInTree = (nodes: NavigationNode[], targetId: string): NavigationNode | null => {
      for (const node of nodes) {
        if (node.id === targetId) {
          return node;
        }
        if (node.children && node.children.length > 0) {
          const found = findNavigationNodeInTree(node.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    return findNavigationNodeInTree(subspace.navigationTree, documentId);
  });
};

export const useFindNavigationNodeInPersonalSubspace = () => {
  return useRefCallback((documentId: string) => {
    const personalSubspace = usePersonalSubspace();
    if (!personalSubspace?.navigationTree) return null;

    const findNavigationNodeInTree = (nodes: NavigationNode[], targetId: string): NavigationNode | null => {
      for (const node of nodes) {
        if (node.id === targetId) {
          return node;
        }
        if (node.children && node.children.length > 0) {
          const found = findNavigationNodeInTree(node.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    return findNavigationNodeInTree(personalSubspace.navigationTree, documentId);
  });
};

export const useNeedsUpdate = () => {
  return useRefCallback((subspaceId: string, updatedAt: Date) => {
    const existing = useSubSpaceStore.getState().subspaces[subspaceId];
    if (!existing) return true;

    const existingDate = new Date(existing.updatedAt);
    return existingDate < updatedAt;
  });
};

export const useIsLastSubspaceAdmin = () => {
  return useRefCallback((subspaceId: string) => {
    const subspace = useSubSpaceStore.getState().subspaces[subspaceId];
    const userInfo = useUserStore.getState().userInfo;

    if (!userInfo?.id || !subspace?.members) {
      return false;
    }

    const admins = subspace.members.filter((member) => member.role === "ADMIN");
    const currentUserIsAdmin = admins.some((admin) => admin.userId === userInfo.id);
    return currentUserIsAdmin && admins.length === 1;
  });
};

// CRUD Operation Hooks
export const useFetchSubspaces = () => {
  return useRequest(
    async (workspaceId: string) => {
      try {
        const subspaces = await subspaceApi.getUserSubspacesIncludingPersonal(workspaceId);

        const mappedSubspaces = subspaces.map((subspace) => ({
          ...subspace,
          index: subspace.index || "0",
          navigationTree: (subspace.navigationTree as NavigationNode[]) ?? [],
          description: subspace.description || undefined,
          updatedAt: new Date(subspace.updatedAt),
          createdAt: new Date(subspace.createdAt),
        }));

        // Convert to record format
        const subspacesMap = mappedSubspaces.reduce(
          (acc, subspace) => {
            acc[subspace.id] = subspace;
            return acc;
          },
          {} as Record<string, SubspaceEntity>,
        );

        useSubSpaceStore.setState({ subspaces: subspacesMap });
        return mappedSubspaces;
      } catch (error) {
        console.error("Failed to fetch subspaces:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useFetchSubspace = () => {
  return useRequest(
    async (subspaceId: string) => {
      try {
        const response = (await subspaceApi.getSubspace(subspaceId)) as any;
        const subspace: SubspaceEntity = {
          ...response.subspace,
          index: response.subspace.index || "0",
          navigationTree: (response.subspace.navigationTree as NavigationNode[]) || [],
          members: response.subspace.members || [],
          memberCount: response.subspace.memberCount || 0,
          updatedAt: new Date(response.subspace.updatedAt),
          createdAt: new Date(response.subspace.createdAt),
        };

        useSubSpaceStore.setState((state) => ({
          subspaces: {
            ...state.subspaces,
            [subspaceId]: subspace,
          },
        }));

        return subspace;
      } catch (error) {
        console.error("Failed to fetch subspace:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useCreateSubspace = () => {
  return useRequest(
    async (payload: CreateSubspaceRequest) => {
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

        useSubSpaceStore.setState((state) => ({
          subspaces: {
            ...state.subspaces,
            [subspace.id]: subspace,
          },
        }));

        // Refresh the subspace list to ensure we have the latest data from server
        try {
          const { run: fetchSubspaces } = useFetchSubspaces();
          await fetchSubspaces(payload.workspaceId);
        } catch (refreshError) {
          console.warn("Failed to refresh subspace list after creation:", refreshError);
        }

        return subspace;
      } catch (error) {
        console.error("Failed to create subspace:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useUpdateSubspace = () => {
  return useRequest(
    async ({ subspaceId, updates }: { subspaceId: string; updates: Partial<SubspaceEntity> }) => {
      try {
        const { name, description, avatar } = updates;
        const response = await subspaceApi.updateSubspace(subspaceId, { name, description, avatar });

        useSubSpaceStore.setState((state) => ({
          subspaces: {
            ...state.subspaces,
            [subspaceId]: {
              ...state.subspaces[subspaceId],
              ...updates,
              updatedAt: new Date(),
            },
          },
        }));

        return response;
      } catch (error) {
        console.error("Failed to update subspace:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useDeleteSubspace = () => {
  return useRequest(
    async ({ subspaceId, permanent = false }: { subspaceId: string; permanent?: boolean }) => {
      try {
        if (permanent) {
          await subspaceApi.deleteSubspace(subspaceId);
        }

        useSubSpaceStore.setState((state) => {
          const newSubspaces = { ...state.subspaces };
          delete newSubspaces[subspaceId];
          return { subspaces: newSubspaces };
        });
      } catch (error) {
        console.error("Failed to delete subspace:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useDuplicateSubspace = () => {
  return useRequest(
    async ({ subspaceId, newName }: { subspaceId: string; newName?: string }) => {
      try {
        const original = useSubSpaceStore.getState().subspaces[subspaceId];
        if (!original) throw new Error("Subspace not found");

        const duplicatePayload = {
          name: newName || `${original.name} (Copy)`,
          workspaceId: original.workspaceId,
          type: original.type as any,
          description: original.description,
        };

        const { run: createSubspace } = useCreateSubspace();
        return await createSubspace(duplicatePayload);
      } catch (error) {
        console.error("Failed to duplicate subspace:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useMoveSubspace = () => {
  return useRequest(
    async ({ subspaceId, index }: { subspaceId: string; index: string }) => {
      try {
        await subspaceApi.moveSubspace(subspaceId, { index });
      } catch (error) {
        console.error("Failed to move subspace:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useJoinSubspace = () => {
  return useRequest(
    async (subspaceId: string) => {
      try {
        await subspaceApi.joinSubspace(subspaceId);
      } catch (error) {
        console.error("Failed to join subspace:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useLeaveSubspace = () => {
  const { t } = useTranslation();

  return useRequest(
    async (subspaceId: string) => {
      try {
        await subspaceApi.leaveSubspace(subspaceId);

        // Remove the subspace from the store after successful leave
        useSubSpaceStore.setState((state) => {
          const newSubspaces = { ...state.subspaces };
          delete newSubspaces[subspaceId];
          return { subspaces: newSubspaces };
        });

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

        throw error;
      }
    },
    { manual: true },
  );
};

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
    { manual: true },
  );
};

export const useBatchRemoveSubspaceMembers = () => {
  return useRequest(
    async ({ subspaceId, memberIds }: { subspaceId: string; memberIds: string[] }) => {
      try {
        const response = await subspaceApi.batchRemoveSubspaceMembers(subspaceId, memberIds);
        return response;
      } catch (error) {
        console.error("Failed to batch remove subspace members:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useFetchSubspaceSettings = () => {
  return useRequest(
    async (subspaceId: string) => {
      try {
        const response = await subspaceApi.getSubspaceSettings(subspaceId);
        useSubSpaceStore.setState({ subspaceSettings: response });
        return response;
      } catch (error) {
        console.error("Failed to fetch subspace settings:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useUpdateSubspaceSettings = () => {
  return useRequest(
    async ({ subspaceId, settings }: { subspaceId: string; settings: UpdateSubspaceSettingsRequest }) => {
      try {
        const response = await subspaceApi.updateSubspaceSettings(subspaceId, settings);
        useSubSpaceStore.setState({ subspaceSettings: response });

        // Also update the subspace entity in the store
        const currentSubspace = useSubSpaceStore.getState().subspaces[subspaceId];
        if (currentSubspace) {
          useSubSpaceStore.setState((state) => ({
            subspaces: {
              ...state.subspaces,
              [subspaceId]: {
                ...currentSubspace,
                name: response.subspace.name,
                description: response.subspace.description || undefined,
                avatar: response.subspace.avatar,
                type: response.subspace.type,
              },
            },
          }));
        }

        return response;
      } catch (error) {
        console.error("Failed to update subspace settings:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useFetchNavigationTree = () => {
  return useRequest(
    async ({ subspaceId, force = false }: { subspaceId: string; force?: boolean }) => {
      try {
        const subspace = useSubSpaceStore.getState().subspaces[subspaceId];
        if (subspace.navigationTree?.length && !force) return;

        const res = await subspaceApi.fetchNavigationTree(subspaceId);
        useSubSpaceStore.setState((state) => ({
          subspaces: {
            ...state.subspaces,
            [subspaceId]: {
              ...state.subspaces[subspaceId],
              navigationTree: Array.isArray(res) ? res : [res],
            },
          },
        }));
      } catch (error) {
        console.error("Failed to fetch navigation tree:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useRefreshNavigationTree = () => {
  return useRequest(
    async (subspaceId: string) => {
      try {
        const { run: fetchNavigationTree } = useFetchNavigationTree();
        await fetchNavigationTree({ subspaceId, force: true });
      } catch (error) {
        console.error("Failed to refresh navigation tree:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useRefreshSubspaceMembers = () => {
  return useRequest(
    async (subspaceId: string) => {
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
        useSubSpaceStore.setState((state) => ({
          subspaces: {
            ...state.subspaces,
            [subspaceId]: {
              ...state.subspaces[subspaceId],
              members: updatedMembers,
              memberCount: response.members.length,
            },
          },
        }));

        // Also update subspaceSettings if it exists and matches the current subspace
        const currentSettings = useSubSpaceStore.getState().subspaceSettings;
        if (currentSettings && currentSettings.subspace.id === subspaceId) {
          useSubSpaceStore.setState({
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
        throw error;
      }
    },
    { manual: true },
  );
};

// Helper Hooks
export const useSetActiveSubspace = () => {
  return useRefCallback((id?: string) => {
    useSubSpaceStore.setState({ activeSubspaceId: id });
  });
};

export const useClearSubspaceSettings = () => {
  return useRefCallback(() => {
    useSubSpaceStore.setState({ subspaceSettings: null });
  });
};

// Document Structure Management Hooks
export const useAddDocumentToStructure = () => {
  return useRefCallback((subspaceId: string, document: DocumentEntity, index = 0) => {
    try {
      const navigationNode: NavigationNode = convertDocEntityToNavigationNode(document);

      useSubSpaceStore.setState((state) => {
        const subspace = state.subspaces[subspaceId];
        if (!subspace) return state;

        const newSubspace = { ...subspace };

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

          if (!newSubspace.navigationTree) {
            newSubspace.navigationTree = [];
          }
          findAndAddToParent(newSubspace.navigationTree);
        } else {
          // Insert at specific index or append to end
          if (!newSubspace.navigationTree) {
            newSubspace.navigationTree = [];
          }
          if (index >= 0 && index < newSubspace.navigationTree.length) {
            newSubspace.navigationTree.splice(index, 0, navigationNode);
          } else {
            newSubspace.navigationTree.push(navigationNode);
          }
        }

        return {
          subspaces: {
            ...state.subspaces,
            [subspaceId]: newSubspace,
          },
        };
      });
    } catch (error) {
      console.error("Failed to add document to subspace structure:", error);
      throw error;
    }
  });
};

export const useRemoveDocumentFromStructure = () => {
  return useRefCallback((subspaceId: string, documentId: string) => {
    useSubSpaceStore.setState((state) => {
      const subspace = state.subspaces[subspaceId];
      if (!subspace?.navigationTree) return state;

      const newSubspace = { ...subspace };
      const newNavigationTree = [...newSubspace.navigationTree];

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

      removeFromTree(newNavigationTree);

      return {
        subspaces: {
          ...state.subspaces,
          [subspaceId]: {
            ...newSubspace,
            navigationTree: newNavigationTree,
          },
        },
      };
    });
  });
};

export const useUpdateDocumentInStructure = () => {
  return useRefCallback((subspaceId: string, documentId: string, updates: Partial<DocumentEntity>) => {
    useSubSpaceStore.setState((state) => {
      const subspace = state.subspaces[subspaceId];
      if (!subspace?.navigationTree) return state;

      const newSubspace = { ...subspace };
      const newNavigationTree = [...newSubspace.navigationTree];

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

      updateNodeInTree(newNavigationTree);

      return {
        subspaces: {
          ...state.subspaces,
          [subspaceId]: {
            ...newSubspace,
            navigationTree: newNavigationTree,
          },
        },
      };
    });
  });
};

export const useMoveDocumentInStructure = () => {
  return useRefCallback((subspaceId: string, documentId: string, newIndex: number, newParentId?: string | null) => {
    useSubSpaceStore.setState((state) => {
      const subspace = state.subspaces[subspaceId];
      if (!subspace?.navigationTree) return state;

      const newSubspace = { ...subspace };
      const newNavigationTree = [...newSubspace.navigationTree];

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

      removeFromTree(newNavigationTree);

      if (!nodeToMove) return state;

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

        findAndAddToParent(newNavigationTree);
      } else {
        // Add to root level
        if (newIndex >= 0 && newIndex < newNavigationTree.length) {
          newNavigationTree.splice(newIndex, 0, nodeToMove);
        } else {
          newNavigationTree.push(nodeToMove);
        }
        (nodeToMove as any).parent = null;
      }

      return {
        subspaces: {
          ...state.subspaces,
          [subspaceId]: {
            ...newSubspace,
            navigationTree: newNavigationTree,
          },
        },
      };
    });
  });
};

export const useReorderDocuments = () => {
  return useRefCallback((subspaceId: string, documentIds: string[]) => {
    useSubSpaceStore.setState((state) => {
      const subspace = state.subspaces[subspaceId];
      if (!subspace?.navigationTree) return state;

      const newSubspace = { ...subspace };
      const newNavigationTree = [...newSubspace.navigationTree];

      // Create a map of nodes by ID
      const nodeMap = new Map<string, NavigationNode>();
      const collectNodes = (nodes: NavigationNode[]) => {
        nodes.forEach((node) => {
          nodeMap.set(node.id, node);
          if (node.children) collectNodes(node.children);
        });
      };
      collectNodes(newNavigationTree);

      // Reorder root level documents
      const reorderedNodes: NavigationNode[] = [];
      documentIds.forEach((id) => {
        const node = nodeMap.get(id);
        if (node && !node.parent) {
          reorderedNodes.push(node);
        }
      });

      // Keep other root nodes
      newNavigationTree.forEach((node) => {
        if (!documentIds.includes(node.id)) {
          reorderedNodes.push(node);
        }
      });

      return {
        subspaces: {
          ...state.subspaces,
          [subspaceId]: {
            ...newSubspace,
            navigationTree: reorderedNodes,
          },
        },
      };
    });
  });
};

// Utility function
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

export default useSubSpaceStore;
