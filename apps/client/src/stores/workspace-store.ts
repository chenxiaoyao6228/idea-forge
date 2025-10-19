import { create } from "zustand";
import { workspaceApi } from "@/apis/workspace";
import { subspaceApi } from "@/apis/subspace";
import useRequest from "@ahooksjs/use-request";
import {
  UpdateWorkspaceRequest,
  WorkspaceSettings,
  WorkspaceMemberListResponse,
  WorkspaceAccessLevel,
  WorkspaceRole,
  WorkspaceListItem,
} from "@idea/contracts";
import { useRefCallback } from "@/hooks/use-ref-callback";
import useUserStore from "./user-store";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { showConfirmModal } from '@/components/ui/confirm-modal';

export interface WorkspaceEntity {
  id: string;
  name: string;
  avatar?: string | null;
  description?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  settings?: WorkspaceSettings | null;
  memberSubspaceCreate?: boolean;
  allowPublicSharing?: boolean;
  type?: "PERSONAL" | "TEAM";
  accessLevel?: WorkspaceAccessLevel;
  isPendingGuest?: boolean;
  guestId?: string;
}

// Minimal Zustand store
const useWorkspaceStore = create<{
  currentWorkspace?: WorkspaceEntity;
  workspaceMembers: WorkspaceMemberListResponse;
  workspaces: Record<string, WorkspaceEntity>;
}>((set) => ({
  currentWorkspace: undefined,
  workspaceMembers: [],
  workspaces: {},
}));

// Data Access Hooks
export const useCurrentWorkspace = () => {
  const userInfo = useUserStore((state) => state.userInfo);
  const workspaces = useWorkspaceStore((state) => state.workspaces);

  if (userInfo?.currentWorkspaceId) {
    return workspaces[userInfo.currentWorkspaceId];
  }

  // Fallback: get from localStorage for backward compatibility
  const workspaceId = localStorage.getItem("workspaceId");
  if (workspaceId) {
    return workspaces[workspaceId];
  }

  return undefined;
};
export const useWorkspaceMembers = () => useWorkspaceStore((state) => state.workspaceMembers);
export const useAllWorkspaces = () => {
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  return Object.values(workspaces);
};

// Computed Value Hooks
export const useWorkspaces = () => {
  return useWorkspaceStore((state) => state.workspaces);
};

export const useGetWorkspaceById = () => {
  return useRefCallback((workspaceId: string) => {
    return useWorkspaceStore.getState().workspaces[workspaceId];
  });
};

export const useIsCurrentWorkspace = () => {
  return useRefCallback((workspaceId: string) => {
    const currentWorkspace = useWorkspaceStore.getState().currentWorkspace;
    return currentWorkspace?.id === workspaceId;
  });
};

// CRUD Operation Hooks
export const useFetchWorkspaces = () => {
  return useRequest(
    async () => {
      try {
        // FIXME: ts errors
        const workspaces = (await workspaceApi.getWorkspaces()) as WorkspaceEntity[];
        if (workspaces && Array.isArray(workspaces)) {
          const workspacesMap = workspaces.reduce(
            (acc, workspace) => {
              acc[workspace.id] = workspace;
              return acc;
            },
            {} as Record<string, WorkspaceEntity>,
          );

          useWorkspaceStore.setState({ workspaces: workspacesMap });

          // Get current workspace from user info first, then fallback to localStorage
          const userInfo = useUserStore.getState().userInfo;
          const currentWorkspaceId = userInfo?.currentWorkspaceId || localStorage.getItem("workspaceId");

          // If no current workspace, set the first one as the current workspace
          // remove the current workspace if not matching the new workspace list in case the user have been removed from the workspace
          if (!currentWorkspaceId || !workspaces.find((workspace) => workspace.id === currentWorkspaceId)) {
            const firstWorkspace = workspaces[0];
            if (firstWorkspace) {
              useWorkspaceStore.setState({ currentWorkspace: firstWorkspace });
              localStorage.setItem("workspaceId", firstWorkspace.id);

              // Update user info with current workspace
              if (userInfo) {
                userInfo.currentWorkspaceId = firstWorkspace.id;
                useUserStore.setState({ userInfo });
              }
            }
          } else {
            const currentWorkspace = workspaces.find((workspace) => workspace.id === currentWorkspaceId);
            if (currentWorkspace) {
              useWorkspaceStore.setState({ currentWorkspace });
              localStorage.setItem("workspaceId", currentWorkspace.id);
            }
          }
          return workspaces;
        }
        return [];
      } catch (error) {
        console.error("Failed to fetch workspaces:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useSwitchWorkspace = () => {
  const { t } = useTranslation();

  return useRequest(
    async (workspaceId: string) => {
      try {
        // Call the new API to switch workspace
        const response = await workspaceApi.switchWorkspace(workspaceId);

        // Update user store with new currentWorkspaceId
        const userInfo = useUserStore.getState().userInfo;
        if (userInfo) {
          userInfo.currentWorkspaceId = workspaceId;
          useUserStore.setState({ userInfo });
        }

        // Update workspace store current workspace
        const workspaces = useWorkspaceStore.getState().workspaces;
        const newCurrentWorkspace = workspaces[workspaceId];
        if (newCurrentWorkspace) {
          useWorkspaceStore.setState({ currentWorkspace: newCurrentWorkspace });
        }

        // Keep localStorage for backward compatibility
        localStorage.setItem("workspaceId", workspaceId);

        // Show welcome modal for first-time guest visitors
        if (response.isFirstGuestVisit && newCurrentWorkspace) {
          const guestName = userInfo?.displayName || userInfo?.email || t("Guest");
          const workspaceName = newCurrentWorkspace.name;

          showConfirmModal({
            title: t("Hello {{name}}, welcome to {{workspace}} space", { name: guestName, workspace: workspaceName }),
            description: t(
              "Your identity in the current space is a collaborative guest, you can only participate in viewing or collaborative editing of designated pages. If you need to access all public content in the entire space, you can contact the administrator to upgrade you to a space member.",
            ),
            confirmText: t("Got it"),
            hideCancel: true,
            onConfirm: () => {
              // Modal will close automatically
              return true;
            },
          });
        }

        // Refresh the page to ensure all components get the new workspace context
        window.location.href = "/";
      } catch (error) {
        console.error("Failed to switch workspace:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useReorderWorkspaces = () => {
  return useRequest(
    async (workspaceIds: string[]) => {
      try {
        await workspaceApi.reorderWorkspaces(workspaceIds);
        // Refresh the list to get the updated order
        const response = await workspaceApi.getWorkspaces();
        if (response && Array.isArray(response)) {
          // Use spread operator to automatically include all fields from API response
          const workspaceEntities: WorkspaceEntity[] = response.map((workspace) => ({
            ...workspace,
            settings: workspace.settings as WorkspaceSettings | null,
          }));

          const workspacesMap = workspaceEntities.reduce(
            (acc, workspace) => {
              acc[workspace.id] = workspace;
              return acc;
            },
            {} as Record<string, WorkspaceEntity>,
          );

          useWorkspaceStore.setState({ workspaces: workspacesMap });
        }
      } catch (error) {
        console.error("Failed to reorder workspaces:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useUpdateWorkspace = () => {
  return useRequest(
    async ({ workspaceId, workspace }: { workspaceId: string; workspace: Partial<UpdateWorkspaceRequest> }) => {
      try {
        const oldWorkspace = useWorkspaceStore.getState().workspaces[workspaceId];
        const updatedWorkspace = await workspaceApi.updateWorkspace(workspaceId, {
          ...oldWorkspace,
          ...workspace,
        } as UpdateWorkspaceRequest);

        // Convert the returned workspace to WorkspaceEntity format
        // Use spread operator to automatically include all fields from API response
        const workspaceEntity: WorkspaceEntity = {
          ...updatedWorkspace,
          settings: updatedWorkspace.settings as WorkspaceSettings | null,
        };

        // Update the workspace in store
        useWorkspaceStore.setState((state) => ({
          workspaces: {
            ...state.workspaces,
            [workspaceId]: workspaceEntity,
          },
        }));

        // Update current workspace if it's the same
        const currentWorkspace = useWorkspaceStore.getState().currentWorkspace;
        if (currentWorkspace?.id === workspaceId) {
          useWorkspaceStore.setState({ currentWorkspace: workspaceEntity });
        }

        return workspaceEntity;
      } catch (error) {
        console.error("Failed to update workspace:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useUpdateWorkspaceSettings = () => {
  return useRequest(
    async ({ workspaceId, settings }: { workspaceId: string; settings: Partial<WorkspaceSettings> }) => {
      try {
        // Get current workspace data
        const workspace = useWorkspaceStore.getState().workspaces[workspaceId];
        if (!workspace) {
          throw new Error("Workspace not found");
        }

        // Prepare update data with current workspace info + new settings
        const updateData: UpdateWorkspaceRequest = {
          name: workspace.name,
          description: workspace.description || null,
          avatar: workspace.avatar || null,
          memberSubspaceCreate: workspace.memberSubspaceCreate || false,
          settings: { ...workspace.settings, ...settings },
        };

        // Call API directly and update store
        const updatedWorkspace = await workspaceApi.updateWorkspace(workspaceId, updateData);

        // Convert the returned workspace to WorkspaceEntity format
        // Use spread operator to automatically include all fields from API response
        const workspaceEntity: WorkspaceEntity = {
          ...updatedWorkspace,
          settings: updatedWorkspace.settings as WorkspaceSettings | null,
        };

        // Update the workspace in store
        useWorkspaceStore.setState((state) => ({
          workspaces: {
            ...state.workspaces,
            [workspaceId]: workspaceEntity,
          },
        }));

        // Update current workspace if it's the same
        const currentWorkspace = useWorkspaceStore.getState().currentWorkspace;
        if (currentWorkspace?.id === workspaceId) {
          useWorkspaceStore.setState({ currentWorkspace: workspaceEntity });
        }

        return workspaceEntity;
      } catch (error) {
        console.error("Failed to update workspace settings:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useBatchAddWorkspaceMembers = () => {
  return useRequest(
    async ({ workspaceId, members }: { workspaceId: string; members: Array<{ userId: string; role: any }> }) => {
      try {
        const response = await workspaceApi.batchAddWorkspaceMembers(workspaceId, { items: members });
        return response;
      } catch (error) {
        console.error("Failed to batch add workspace members:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useBatchSetWorkspaceWide = () => {
  return useRequest(
    async (subspaceIds: string[]) => {
      try {
        await subspaceApi.batchSetWorkspaceWide({ subspaceIds });
        // Refresh current workspace to get updated subspaces
        const currentWorkspace = useWorkspaceStore.getState().currentWorkspace;
        if (currentWorkspace) {
          const response = await workspaceApi.getWorkspaces();
          if (response && Array.isArray(response)) {
            // Use spread operator to automatically include all fields from API response
            const workspaceEntities: WorkspaceEntity[] = response.map((workspace) => ({
              ...workspace,
              settings: workspace.settings as WorkspaceSettings | null,
            }));

            const workspacesMap = workspaceEntities.reduce(
              (acc, workspace) => {
                acc[workspace.id] = workspace;
                return acc;
              },
              {} as Record<string, WorkspaceEntity>,
            );

            useWorkspaceStore.setState({ workspaces: workspacesMap });
          }
        }
      } catch (error) {
        console.error("Failed to batch set workspace-wide:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

// Helper Hooks
export const useSetCurrentWorkspace = () => {
  return useRefCallback((workspace?: WorkspaceEntity) => {
    const userInfo = useUserStore.getState().userInfo;
    if (userInfo) {
      userInfo.currentWorkspaceId = workspace?.id;
      useUserStore.setState({ userInfo });
    }
  });
};

export const useClearWorkspace = () => {
  return useRefCallback(() => {
    useWorkspaceStore.setState({
      currentWorkspace: undefined,
      workspaceMembers: [],
      workspaces: {},
    });
  });
};

// Helper to switch to first available workspace without page reload
export const useSwitchToFirstWorkspace = () => {
  return useRefCallback(async () => {
    const workspaces = useWorkspaceStore.getState().workspaces;
    const firstWorkspace = Object.values(workspaces)[0];

    if (firstWorkspace) {
      // Update user store with new currentWorkspaceId
      const userInfo = useUserStore.getState().userInfo;
      if (userInfo) {
        userInfo.currentWorkspaceId = firstWorkspace.id;
        useUserStore.setState({ userInfo });
      }

      // Update workspace store current workspace
      useWorkspaceStore.setState({ currentWorkspace: firstWorkspace });

      // Keep localStorage for backward compatibility
      localStorage.setItem("workspaceId", firstWorkspace.id);

      // Call the API to switch workspace on the server
      try {
        await workspaceApi.switchWorkspace(firstWorkspace.id);
      } catch (error) {
        console.error("Failed to switch workspace on server:", error);
        // Continue anyway since local state is updated
      }

      return firstWorkspace;
    }

    return null;
  });
};

// Hook for fetching workspace members
export const useFetchMembers = () => {
  return useRequest(
    async (workspaceId: string) => {
      try {
        const response = await workspaceApi.getWorkspaceMembers(workspaceId);
        const members = response || [];

        useWorkspaceStore.setState({
          workspaceMembers: members,
        });

        return members;
      } catch (error) {
        console.error("Failed to fetch workspace members:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useCreateWorkspace = () => {
  const { t } = useTranslation();

  return useRequest(
    async (params: { name: string; description: string; avatar: string; type: "PERSONAL" | "TEAM" }) => {
      try {
        const workspace = await workspaceApi.createWorkspace({
          name: params.name,
          description: params.description,
          avatar: params.avatar,
          type: params.type,
        });

        toast.success(t("Workspace created successfully"), {
          description: t("Your new workspace has been created and you have been automatically switched to it."),
        });

        return workspace;
      } catch (error) {
        console.error("Failed to create workspace:", error);
        toast.error(t("Failed to create workspace"), {
          description: (error as any)?.message || t("An unexpected error occurred while creating the workspace."),
        });
        throw error;
      }
    },
    { manual: true },
  );
};

export const useLeaveWorkspace = () => {
  const { t } = useTranslation();

  const leaveWorkspace = async (workspaceId: string, workspaceName: string) => {
    const confirmed = await showConfirmModal({
      title: t("Leave Workspace"),
      description: t(`Are you sure you want to leave workspace \"{{workspaceName}}\"? You will lose access to all documents and subspaces in this workspace.`, {
        workspaceName,
      }),
      confirmText: t("Leave Workspace"),
      cancelText: t("Cancel"),
      confirmVariant: "destructive",
    });

    if (confirmed) {
      try {
        // Call the leave workspace API directly
        await workspaceApi.leaveWorkspace(workspaceId);

        // Remove the workspace from the store
        useWorkspaceStore.setState((state) => {
          const { [workspaceId]: removedWorkspace, ...remainingWorkspaces } = state.workspaces;
          return {
            workspaces: remainingWorkspaces,
            currentWorkspace: state.currentWorkspace?.id === workspaceId ? undefined : state.currentWorkspace,
            workspaceMembers: state.currentWorkspace?.id === workspaceId ? [] : state.workspaceMembers,
          };
        });

        // Update user store to remove the current workspace ID if it was the one we left
        const userInfo = useUserStore.getState().userInfo;
        if (userInfo?.currentWorkspaceId === workspaceId) {
          userInfo.currentWorkspaceId = undefined;
          useUserStore.setState({ userInfo });
        }

        // Clear localStorage
        if (localStorage.getItem("workspaceId") === workspaceId) {
          localStorage.removeItem("workspaceId");
        }

        // Refresh the page to ensure all components get the new workspace context
        window.location.href = "/";

        toast.success(t("Successfully left workspace"), {
          description: t("You have been removed from the workspace and redirected."),
        });
      } catch (error: any) {
        console.error("Failed to leave workspace after confirmation:", error);

        // Handle specific error for last owner
        if (error?.code === "cannot_leave_as_last_owner") {
          const deleteConfirmed = await showConfirmModal({
            title: t("Cannot Leave Workspace"),
            description: t(
              `You are the last owner of this workspace. To leave, you must first delete the workspace. This action cannot be undone and will permanently remove all documents and data in this workspace.`,
            ),
            confirmText: t("Delete Workspace"),
            cancelText: t("Cancel"),
            confirmVariant: "destructive",
          });

          if (deleteConfirmed) {
            try {
              await workspaceApi.deleteWorkspace(workspaceId);

              // Redirect to home page
              window.location.href = "/";

              toast.success(t("Workspace deleted successfully"), {
                description: t("The workspace and all its contents have been permanently removed."),
              });
            } catch (deleteError: any) {
              console.error("Failed to delete workspace:", deleteError);

              // Handle workspace has documents error
              if (deleteError?.code === "workspace_has_documents") {
                toast.error(t("Cannot delete workspace"), {
                  description: t("This workspace contains documents. Please delete all documents in the workspace before deleting it."),
                });
              } else {
                toast.error(t("Failed to delete workspace"), {
                  description: deleteError?.message || t("An error occurred while deleting the workspace."),
                });
              }
            }
          }
        } else {
          // Handle other errors with generic message
          toast.error(t("Failed to leave workspace"), {
            description: (error as any)?.message || t("An unexpected error occurred."),
          });
        }
      }
    }
  };

  return {
    run: leaveWorkspace,
  };
};

export default useWorkspaceStore;
