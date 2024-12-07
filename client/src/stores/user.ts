import { create } from "zustand";

export interface UserInfo {
  id: number;
  email: string;
  displayName: string;
  imageUrl: string;
}


interface UserStoreState {
  userInfo: UserInfo | null;
  setUserInfo: (userInfo: UserInfo) => void;
  logout: () => void;
}

const useUserStore = create<UserStoreState>()((set) => ({
  userInfo: null,
  setUserInfo: (userInfo) => set({ userInfo }),
  logout: () => set({ userInfo: null }),
}));

export default useUserStore;
