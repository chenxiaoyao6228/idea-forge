import { authApi } from "@/apis/auth";
import { create } from "zustand";
import { UserResponseData } from "@idea/contracts";
import useWorkspaceStore from "./workspace";

const STORE_NAME = "workspaceStore";

export interface UserInfo extends UserResponseData {}

interface UserStoreState {
  loading: boolean;
  userInfo: UserInfo | null;
  setUserInfo: (userInfo: UserInfo) => void;
  logout: () => void;
}

const useUserStore = create<UserStoreState>()((set) => ({
  loading: false,
  userInfo: null,
  setUserInfo: (userInfo) => set({ userInfo }),
  logout: async () => {
    set({ loading: true });
    await authApi.logout();
    localStorage.clear();

    // FIXME: better/unified way to clear all stores
    useWorkspaceStore.getState().clear();
    set({ userInfo: null, loading: false });
  },
}));

export default useUserStore;
