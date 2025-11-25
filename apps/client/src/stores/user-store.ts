import { authApi } from "@/apis/auth";
import { create } from "zustand";
import { UserResponseData } from "@idea/contracts";
import useRequest from "@ahooksjs/use-request";
import { toast } from "sonner";
import useWorkspaceStore from "./workspace-store";
import { showConfirmModal } from "@/components/ui/confirm-modal";
import i18n from "@/lib/i18n";

export interface UserInfo extends UserResponseData {}

// Minimal store - only state
const useUserStore = create<{
  userInfo: UserInfo | null;
}>(() => ({
  userInfo: null,
}));

// Logout operation hook with confirmation modal
export const useLogout = () => {
  const { run, loading } = useRequest(
    async () => {
      await authApi.logout();
      localStorage.clear();

      // Clear workspace store
      useWorkspaceStore.setState({
        workspaceMembers: [],
        workspaces: {},
      });

      // Reset user store
      useUserStore.setState({ userInfo: null });

      // Use window.location.href for full page reload to clear all state
      window.location.href = "/login";

      return true;
    },
    {
      manual: true,
      onError: (error) => {
        console.error("Failed to logout:", error);
        toast.error(i18n.t("Failed to logout"), {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      },
    },
  );

  const logout = async () => {
    await showConfirmModal({
      title: i18n.t("Are you sure you want to sign out?"),
      description: i18n.t("You will be logged out of your account and will need to sign in again to access your data."),
      confirmText: i18n.t("Sign Out"),
      cancelText: i18n.t("Cancel"),
      confirmVariant: "destructive",
      async onConfirm() {
        await run();
        return false;
      },
    });
  };

  return { logout, loading };
};

// Computed values
export const useCurrentUser = () => {
  return useUserStore((state) => state.userInfo);
};

export default useUserStore;
