import { authApi } from "@/apis/auth";
import { create } from "zustand";
import { UserResponseData } from "@idea/contracts";
import useRequest from "@ahooksjs/use-request";
import { toast } from "sonner";
import useWorkspaceStore from "./workspace-store";

export interface UserInfo extends UserResponseData {}

// Minimal store - only state
const useUserStore = create<{
  userInfo: UserInfo | null;
}>((set) => ({
  userInfo: null,
}));

// Logout operation hook
export const useLogout = () => {
  return useRequest(
    async () => {
      try {
        await authApi.logout();
        localStorage.clear();

        // FIXME: better way to do this
        // Clear workspace store
        useWorkspaceStore.setState({
          workspaceMembers: [],
          workspaces: {},
        });

        // Reset user store
        useUserStore.setState({ userInfo: null });

        toast.success("Logged out successfully");
        return true;
      } catch (error) {
        console.error("Failed to logout:", error);
        toast.error("Failed to logout", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
    {
      manual: true,
    },
  );
};

export default useUserStore;
