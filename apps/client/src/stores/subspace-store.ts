import { create } from "zustand";
import { useMemo } from "react";
import useRequest from "@ahooksjs/use-request";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { orderBy, groupBy, uniqBy } from "lodash-es";
import {
  CreateSubspaceRequest,
  NavigationNode,
  NavigationNodeType,
  SubspaceMember,
  SubspaceSettingsResponse,
  SubspaceTypeSchema,
  UpdateSubspaceSettingsRequest,
} from "@idea/contracts";
import { subspaceApi } from "@/apis/subspace";
import { DocumentEntity } from "./document-store";
import useUserStore from "./user-store";
import { useRefCallback } from "@/hooks/use-ref-callback";

export interface SubspaceEntity {
  id: string;
  name: string;
  avatar?: string | null;
  workspaceId: string;
  type: keyof typeof SubspaceTypeSchema.enum;
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
  isCreating: boolean;
}>((set) => ({
  subspaces: {},
  activeSubspaceId: undefined,
  expandedKeys: new Set(),
  subspaceSettings: null,
  isCreating: false,
}));

// Computed values as hooks
export const useAllSubspaces = () => {
  const subspaces = useSubSpaceStore((state) => state.subspaces);
  return useMemo(() => {
    return orderBy(Object.values(subspaces), ["index"], ["asc"]).filter((subspace) => subspace.type !== "PERSONAL");
  }, [subspaces]);
};

export const useJoinedSubspaces = () => {
  const subspaces = useSubSpaceStore((state) => state.subspaces);
  const { userInfo } = useUserStore();

  return useMemo(() => {
    return orderBy(Object.values(subspaces), ["index"], ["asc"])
      .filter((subspace) => subspace?.members?.some((member) => member?.userId === userInfo?.id))
      .filter((subspace) => subspace.type !== "PERSONAL");
  }, [subspaces, userInfo?.id]);
};

export const usePersonalSubspace = () => {
  const subspaces = useSubSpaceStore((state) => state.subspaces);
  return useMemo(() => {
    return Object.values(subspaces).find((subspace) => subspace.type === "PERSONAL");
  }, [subspaces]);
};

export const useActiveSubspace = () => {
  const subspaces = useSubSpaceStore((state) => state.subspaces);
  const activeSubspaceId = useSubSpaceStore((state) => state.activeSubspaceId);
  return useMemo(() => {
    return activeSubspaceId ? subspaces[activeSubspaceId] : undefined;
  }, [subspaces, activeSubspaceId]);
};

export const useSubspacesAsNavigationNodes = () => {
  const subspaces = useSubSpaceStore((state) => state.subspaces);
  return useMemo(() => {
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
  }, [subspaces]);
};

export const useSubspaceById = (subspaceId?: string) => {
  const subspaces = useSubSpaceStore((state) => state.subspaces);
  return useMemo(() => {
    return subspaceId ? subspaces[subspaceId] : undefined;
  }, [subspaces, subspaceId]);
};

export const useSubspaceMembers = (subspaceId?: string) => {
  const subspaces = useSubSpaceStore((state) => state.subspaces);
  return useMemo(() => {
    return subspaceId ? subspaces[subspaceId]?.members : undefined;
  }, [subspaces, subspaceId]);
};

export const useSubspaceNavigationTree = (subspaceId?: string) => {
  const subspaces = useSubSpaceStore((state) => state.subspaces);
  return useMemo(() => {
    return subspaceId ? subspaces[subspaceId]?.navigationTree : undefined;
  }, [subspaces, subspaceId]);
};

export const useSubspaceDocumentCount = (subspaceId?: string) => {
  const subspaces = useSubSpaceStore((state) => state.subspaces);
  return useMemo(() => {
    if (!subspaceId) return 0;
    const subspace = subspaces[subspaceId];
    if (!subspace?.navigationTree) return 0;

    const countNodes = (nodes: NavigationNode[]): number => {
      return nodes.reduce((count, node) => {
        return count + 1 + (node.children ? countNodes(node.children) : 0);
      }, 0);
    };

    return countNodes(subspace.navigationTree);
  }, [subspaces, subspaceId]);
};

export const useExpandedKeysForSubspace = (subspaceId?: string) => {
  const expandedKeys = useSubSpaceStore((state) => state.expandedKeys);
  return useMemo(() => {
    if (!subspaceId) return [];
    const keys: string[] = [];
    expandedKeys.forEach((key) => {
      if (key.startsWith(`${subspaceId}:`)) {
        keys.push(key.replace(`${subspaceId}:`, ""));
      }
    });
    return keys;
  }, [expandedKeys, subspaceId]);
};

// Helper functions as hooks
export const useIsSubspaceExpanded = () => {
  const expandedKeys = useSubSpaceStore((state) => state.expandedKeys);

  return useRefCallback((subspaceId: string, nodeId: string) => {
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
    const subspaces = useSubSpaceStore.getState().subspaces;
    const subspace = subspaces[subspaceId];
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
    const subspaces = useSubSpaceStore.getState().subspaces;
    const subspace = subspaces[subspaceId];
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
  const getPathToDocument = useGetPathToDocument();

  return useRefCallback((subspaceId: string, documentId: string) => {
    const path = getPathToDocument(subspaceId, documentId);
    return path.length > 0;
  });
};

export const useGetExpandedKeysForDocument = () => {
  const getPathToDocument = useGetPathToDocument();

  return useRefCallback((subspaceId: string, documentId: string) => {
    const path = getPathToDocument(subspaceId, documentId);
    return path.slice(0, -1).map((node) => node.id);
  });
};

export const useFindNavigationNodeInSubspace = () => {
  return useRefCallback((subspaceId: string, documentId: string) => {
    const subspaces = useSubSpaceStore.getState().subspaces;
    const subspace = subspaces[subspaceId];
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
    const subspaces = useSubSpaceStore.getState().subspaces;
    const personalSubspace = Object.values(subspaces).find((s) => s.type === "PERSONAL");
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
    const subspaces = useSubSpaceStore.getState().subspaces;
    const existing = subspaces[subspaceId];
    if (!existing) return true;

    const existingDate = new Date(existing.updatedAt);
    return existingDate < updatedAt;
  });
};

export const useIsLastSubspaceAdmin = (subspaceId: string) => {
  const subspace = useSubspaceById(subspaceId);
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

// CRUD operation hooks
export const useFetchSubspaces = () => {
  return useRequest(
    async (workspaceId: string) => {
      try {
        const response = await subspaceApi.getUserSubspacesIncludingPersonal(workspaceId);
        const subspaces = response.map((subspace) => ({
          ...subspace,
          index: subspace.index || "0",
          navigationTree: (subspace.navigationTree as NavigationNode[]) ?? [],
          updatedAt: new Date(subspace.updatedAt),
          createdAt: new Date(subspace.createdAt),
          description: subspace.description || undefined,
        }));

        // Update store using direct setState with vanilla JS
        useSubSpaceStore.setState((state) => {
          const newSubspaces = { ...state.subspaces };
          subspaces.forEach((subspace) => {
            newSubspaces[subspace.id] = subspace;
          });
          return { subspaces: newSubspaces };
        });

        return subspaces;
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
          navigationTree: response.subspace.navigationTree as NavigationNode[],
          members: response.subspace.members || [],
          memberCount: response.subspace.memberCount || 0,
          updatedAt: new Date(response.subspace.updatedAt),
          createdAt: new Date(response.subspace.createdAt),
        };

        // Update store using direct setState
        useSubSpaceStore.setState((state) => ({
          subspaces: { ...state.subspaces, [subspace.id]: subspace },
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
  const { t } = useTranslation();

  return useRequest(
    async (payload: CreateSubspaceRequest) => {
      try {
        useSubSpaceStore.setState({ isCreating: true });

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

        // Update store using direct setState
        useSubSpaceStore.setState((state) => ({
          subspaces: { ...state.subspaces, [subspace.id]: subspace },
        }));

        // Refresh the subspace list to ensure we have the latest data from server
        try {
          const subspaces = await useFetchSubspaces().run(payload.workspaceId);
          // subspaces already updated in the hook above
        } catch (refreshError) {
          console.warn("Failed to refresh subspace list after creation:", refreshError);
        }

        toast.success(t("Subspace created successfully"));
        return subspace;
      } catch (error) {
        console.error("Failed to create subspace:", error);
        toast.error(t("Failed to create subspace"));
        throw error;
      } finally {
        useSubSpaceStore.setState({ isCreating: false });
      }
    },
    { manual: true },
  );
};

export const useUpdateSubspace = () => {
  const { t } = useTranslation();

  return useRequest(
    async (params: { subspaceId: string; updates: Partial<SubspaceEntity> }) => {
      try {
        const { name, description, avatar } = params.updates;
        const response = await subspaceApi.updateSubspace(params.subspaceId, { name, description, avatar });

        // Update store using direct setState
        useSubSpaceStore.setState((state) => ({
          subspaces: {
            ...state.subspaces,
            [params.subspaceId]: {
              ...state.subspaces[params.subspaceId],
              ...params.updates,
              updatedAt: new Date(),
            },
          },
        }));

        toast.success(t("Subspace updated successfully"));
        return response;
      } catch (error) {
        console.error("Failed to update subspace:", error);
        toast.error(t("Failed to update subspace"));
        throw error;
      }
    },
    { manual: true },
  );
};

export const useDeleteSubspace = () => {
  const { t } = useTranslation();

  return useRequest(
    async (params: { subspaceId: string; options?: { permanent?: boolean } }) => {
      try {
        if (params.options?.permanent) {
          await subspaceApi.deleteSubspace(params.subspaceId);
        }

        // Update store using direct setState with vanilla JS
        useSubSpaceStore.setState((state) => {
          const newSubspaces = { ...state.subspaces };
          delete newSubspaces[params.subspaceId];
          return { subspaces: newSubspaces };
        });

        toast.success(t("Subspace deleted successfully"));
      } catch (error) {
        console.error("Failed to delete subspace:", error);
        toast.error(t("Failed to delete subspace"));
        throw error;
      }
    },
    { manual: true },
  );
};

export const useDuplicateSubspace = () => {
  const { t } = useTranslation();
  const createSubspace = useCreateSubspace();

  return useRequest(
    async (params: { subspaceId: string; newName?: string }) => {
      try {
        const subspaces = useSubSpaceStore.getState().subspaces;
        const original = subspaces[params.subspaceId];
        if (!original) throw new Error("Subspace not found");

        const duplicatePayload = {
          name: params.newName || `${original.name} (Copy)`,
          workspaceId: original.workspaceId,
          type: original.type as any,
          description: original.description,
        };

        return await createSubspace.run(duplicatePayload);
      } catch (error) {
        console.error("Failed to duplicate subspace:", error);
        toast.error(t("Failed to duplicate subspace"));
        throw error;
      }
    },
    { manual: true },
  );
};

export const useMoveSubspace = () => {
  const { t } = useTranslation();

  return useRequest(
    async (params: { subspaceId: string; index: string }) => {
      try {
        await subspaceApi.moveSubspace(params.subspaceId, { index: params.index });
        toast.success(t("Subspace moved successfully"));
      } catch (error) {
        console.error("Failed to move subspace:", error);
        toast.error(t("Failed to move subspace"));
        throw error;
      }
    },
    { manual: true },
  );
};

export const useJoinSubspace = () => {
  const { t } = useTranslation();

  return useRequest(
    async (params: { subspaceId: string }) => {
      try {
        await subspaceApi.joinSubspace(params.subspaceId);
        toast.success(t("Successfully joined the subspace"));
      } catch (error) {
        console.error("Failed to join subspace:", error);
        toast.error(t("Failed to join subspace"));
        throw error;
      }
    },
    { manual: true },
  );
};

export const useLeaveSubspace = () => {
  const { t } = useTranslation();

  return useRequest(
    async (params: { subspaceId: string }) => {
      try {
        await subspaceApi.leaveSubspace(params.subspaceId);

        // Remove the subspace from the store after successful leave
        useSubSpaceStore.setState((state) => {
          const newSubspaces = { ...state.subspaces };
          delete newSubspaces[params.subspaceId];
          return { subspaces: newSubspaces };
        });

        toast.success(t("Successfully left the subspace"));
        return { success: true };
      } catch (error: any) {
        console.error("Failed to leave subspace:", error);

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
  const { t } = useTranslation();

  return useRequest(
    async (params: { subspaceId: string; memberIds: string[] }) => {
      try {
        const response = await subspaceApi.batchRemoveSubspaceMembers(params.subspaceId, params.memberIds);
        toast.success(t("Successfully removed {{count}} member(s)", { count: params.memberIds.length }));
        return response;
      } catch (error) {
        console.error("Failed to batch remove subspace members:", error);
        toast.error(t("Failed to remove members"));
        throw error;
      }
    },
    { manual: true },
  );
};

export const useFetchSubspaceSettings = () => {
  const { t } = useTranslation();

  return useRequest(
    async (subspaceId: string) => {
      try {
        const response = await subspaceApi.getSubspaceSettings(subspaceId);

        // Update store using direct setState
        useSubSpaceStore.setState({ subspaceSettings: response });

        return response;
      } catch (error) {
        console.error("Failed to fetch subspace settings:", error);
        toast.error(t("Failed to fetch subspace settings"));
        throw error;
      }
    },
    { manual: true },
  );
};

export const useUpdateSubspaceSettings = () => {
  const { t } = useTranslation();

  return useRequest(
    async (params: { subspaceId: string; settings: UpdateSubspaceSettingsRequest }) => {
      const currentState = useSubSpaceStore.getState();
      const currentSettings = currentState.subspaceSettings;

      // Optimistic update
      if (currentSettings) {
        const optimisticSettings = {
          ...currentSettings,
          subspace: {
            ...currentSettings.subspace,
            ...params.settings,
          },
        };
        useSubSpaceStore.setState({ subspaceSettings: optimisticSettings });
      }

      try {
        const response = await subspaceApi.updateSubspaceSettings(params.subspaceId, params.settings);

        // Update store with actual response
        useSubSpaceStore.setState({ subspaceSettings: response });

        // Also update the subspace entity in the store
        useSubSpaceStore.setState((state) => {
          const currentSubspace = state.subspaces[params.subspaceId];
          if (currentSubspace) {
            return {
              subspaces: {
                ...state.subspaces,
                [params.subspaceId]: {
                  ...currentSubspace,
                  name: response.subspace.name,
                  description: response.subspace.description || undefined,
                  avatar: response.subspace.avatar,
                  type: response.subspace.type,
                },
              },
            };
          }
          return state;
        });

        toast.success(t("Subspace settings updated successfully"));
        return response;
      } catch (error) {
        console.error("Failed to update subspace settings:", error);

        // Revert optimistic update on error
        if (currentSettings) {
          useSubSpaceStore.setState({ subspaceSettings: currentSettings });
        }

        toast.error(t("Failed to update subspace settings"));
        throw error;
      }
    },
    { manual: true },
  );
};

export const useFetchNavigationTree = () => {
  const { t } = useTranslation();

  return useRequest(
    async (params: { subspaceId: string; options?: { force?: boolean } }) => {
      try {
        const subspaces = useSubSpaceStore.getState().subspaces;
        const subspace = subspaces[params.subspaceId];

        if (subspace.navigationTree?.[params.subspaceId] && !params.options?.force) return;

        const res = await subspaceApi.fetchNavigationTree(params.subspaceId);

        // Update store using direct setState
        useSubSpaceStore.setState((state) => ({
          subspaces: {
            ...state.subspaces,
            [params.subspaceId]: {
              ...state.subspaces[params.subspaceId],
              navigationTree: Array.isArray(res) ? res : ([res] as NavigationNode[]),
            },
          },
        }));
      } catch (error) {
        console.error("Failed to fetch navigation tree:", error);
        toast.error(t("Failed to fetch navigation tree"));
        throw error;
      }
    },
    { manual: true },
  );
};

export const useRefreshNavigationTree = () => {
  const fetchNavigationTree = useFetchNavigationTree();

  return useRefCallback(async (subspaceId: string) => {
    await fetchNavigationTree.run({ subspaceId, options: { force: true } });
  });
};

export const useRefreshSubspaceMembers = () => {
  const { t } = useTranslation();

  return useRequest(
    async (subspaceId: string) => {
      try {
        const response = await subspaceApi.getSubspaceMembers(subspaceId);

        const updatedMembers = response.members.map((member) => ({
          ...member,
          user: {
            ...member.user,
            imageUrl: member.user.imageUrl || "",
          },
        }));

        // Update store using direct setState
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
        useSubSpaceStore.setState((state) => {
          const currentSettings = state.subspaceSettings;
          if (currentSettings && currentSettings.subspace.id === subspaceId) {
            return {
              subspaceSettings: {
                ...currentSettings,
                subspace: {
                  ...currentSettings.subspace,
                  members: updatedMembers,
                  memberCount: response.members.length,
                },
              },
            };
          }
          return state;
        });
      } catch (error) {
        console.error("Failed to refresh subspace members:", error);
        toast.error(t("Failed to refresh subspace members"));
        throw error;
      }
    },
    { manual: true },
  );
};

export const useSetActiveSubspace = () => {
  return useRefCallback((id?: string) => {
    useSubSpaceStore.setState({ activeSubspaceId: id });
  });
};

// Document structure management hooks
export const useAddDocumentToStructure = () => {
  return useRefCallback((subspaceId: string, document: DocumentEntity, index = 0) => {
    try {
      const navigationNode: NavigationNode = convertDocEntityToNavigationNode(document);

      useSubSpaceStore.setState((state) => {
        const subspace = state.subspaces[subspaceId];
        if (!subspace) return state;

        const newSubspace = { ...subspace };
        if (!newSubspace.navigationTree) {
          newSubspace.navigationTree = [];
        }

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

          findAndAddToParent(newSubspace.navigationTree);
        } else {
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
      newSubspace.navigationTree = newNavigationTree;

      return {
        subspaces: {
          ...state.subspaces,
          [subspaceId]: newSubspace,
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
      newSubspace.navigationTree = newNavigationTree;

      return {
        subspaces: {
          ...state.subspaces,
          [subspaceId]: newSubspace,
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
        if (newIndex >= 0 && newIndex < newNavigationTree.length) {
          newNavigationTree.splice(newIndex, 0, nodeToMove);
        } else {
          newNavigationTree.push(nodeToMove);
        }
        (nodeToMove as any).parent = null;
      }

      newSubspace.navigationTree = newNavigationTree;

      return {
        subspaces: {
          ...state.subspaces,
          [subspaceId]: newSubspace,
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

      newSubspace.navigationTree = reorderedNodes;

      return {
        subspaces: {
          ...state.subspaces,
          [subspaceId]: newSubspace,
        },
      };
    });
  });
};

// Utility functions
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

// Legacy methods for backward compatibility
export const useSetActiveSubspaceLegacy = () => {
  return useRefCallback((id?: string) => {
    useSubSpaceStore.setState({ activeSubspaceId: id });
  });
};

export const useAddDocument = () => {
  return useRefCallback((subspaceId: string, document: DocumentEntity) => {
    const addDocumentToStructure = useAddDocumentToStructure();
    addDocumentToStructure(subspaceId, document, 0);
  });
};

export const useRemoveDocument = () => {
  return useRefCallback((subspaceId: string, documentId: string) => {
    const removeDocumentFromStructure = useRemoveDocumentFromStructure();
    removeDocumentFromStructure(subspaceId, documentId);
  });
};

export const useFetchNavigationTreeLegacy = () => {
  const fetchNavigationTree = useFetchNavigationTree();

  return useRefCallback(async (subspaceId: string, options?: { force?: boolean }) => {
    await fetchNavigationTree.run({ subspaceId, options });
  });
};

export const getPersonalSubspace = () => {
  const subspaces = useSubSpaceStore.getState().subspaces;
  return Object.values(subspaces).find((s) => s.type === "PERSONAL");
};

export default useSubSpaceStore;
