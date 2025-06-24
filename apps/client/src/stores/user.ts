import { authApi } from "@/apis/auth";
import { create } from "zustand";
import { UserResponseData } from "@idea/contracts";

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
    set({ userInfo: null });
    set({ loading: false });
  },
}));

export default useUserStore;
