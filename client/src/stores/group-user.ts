import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import { groupApi } from "@/apis/group";
import createEntitySlice, { EntityState, EntityActions } from "./utils/entity-slice";
import { GroupUser } from "@/types/group";

interface FetchOptions {
  force?: boolean;
  prefetch?: boolean;
}

interface State {
  isFetching: boolean;
  isSaving: boolean;
  isLoaded: boolean;
}

interface Action {
  // API actions
  fetch: (options?: FetchOptions) => Promise<GroupUser[]>;
  addUser: (groupId: string, userId: string) => Promise<GroupUser>;
  removeUser: (groupId: string, userId: string) => Promise<void>;

  // Helper methods
  getByGroupId: (groupId: string) => GroupUser[];
  getByUserId: (userId: string) => GroupUser[];
}

const defaultState: State = {
  isFetching: false,
  isSaving: false,
  isLoaded: false,
};

const groupUserEntitySlice = createEntitySlice<GroupUser>();
export const groupUserSelectors = groupUserEntitySlice.selectors;

type StoreState = State & Action & EntityState<GroupUser> & EntityActions<GroupUser>;
const useGroupUserStore = create<StoreState>()(
  subscribeWithSelector(
    devtools(
      createComputed((state: StoreState) => ({
        orderedGroupUsers: groupUserSelectors.selectAll(state),
      }))((set, get) => ({
        ...defaultState,
        ...groupUserEntitySlice.initialState,
        ...groupUserEntitySlice.createActions(set),

        fetch: async (options = {}) => {
          if (!options.prefetch) {
            set({ isFetching: true });
          }

          try {
            const response = await groupApi.getInfo("all");
            const groupUsers = response.data.members.map((member) => ({
              id: `${member.id}-${response.data.id}`,
              userId: member.id.toString(),
              groupId: response.data.id,
              createdAt: response.data.createdAt.toISOString(),
              updatedAt: response.data.updatedAt.toISOString(),
            }));
            get().setAll(groupUsers);
            return groupUsers;
          } finally {
            set({ isFetching: false });
          }
        },

        addUser: async (groupId, userId) => {
          set({ isSaving: true });
          try {
            const response = await groupApi.getInfo(groupId);
            const groupUser = {
              id: `${userId}-${groupId}`,
              userId,
              groupId,
              createdAt: response.data.createdAt.toISOString(),
              updatedAt: response.data.updatedAt.toISOString(),
            };
            get().addOne(groupUser);
            return groupUser;
          } finally {
            set({ isSaving: false });
          }
        },

        removeUser: async (groupId, userId) => {
          set({ isSaving: true });
          try {
            await groupApi.delete(groupId);
            get().removeOne(`${userId}-${groupId}`);
          } finally {
            set({ isSaving: false });
          }
        },

        getByGroupId: (groupId) => groupUserSelectors.selectAll(get()).filter((groupUser) => groupUser.groupId === groupId),

        getByUserId: (userId) => groupUserSelectors.selectAll(get()).filter((groupUser) => groupUser.userId === userId),
      })),
      {
        name: "groupUserStore",
      },
    ),
  ),
);

export default useGroupUserStore;
