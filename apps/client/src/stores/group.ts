import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import { groupApi } from "@/apis/group";
import createEntitySlice, { EntityState, EntityActions } from "./utils/entity-slice";
import useWorkspaceStore from "./workspace";

export interface GroupMember {
  userId: string;
  user: any;
}

export interface GroupEntity {
  id: string;
  name: string;
  description: string | null;
  members: GroupMember[];
}

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
  fetch: (options?: FetchOptions) => Promise<GroupEntity[]>;
  create: (data: { name: string; description?: string }) => Promise<GroupEntity>;
  update: (id: string, data: { name?: string; description?: string }) => Promise<GroupEntity>;
  delete: (id: string) => Promise<void>;
  addUser: (groupId: string, userId: string) => Promise<GroupEntity>;
  removeUser: (groupId: string, userId: string) => Promise<GroupEntity>;

  // Fetch groups for workspace
  fetchWorkspaceGroups: (workspaceId: string) => Promise<GroupEntity[]>;
}

const defaultState: State = {
  isFetching: false,
  isSaving: false,
  isLoaded: false,
};

const groupEntitySlice = createEntitySlice<GroupEntity>();
export const groupSelectors = groupEntitySlice.selectors;

type StoreState = State & Action & EntityState<GroupEntity> & EntityActions<GroupEntity>;
const useGroupStore = create<StoreState>()(
  subscribeWithSelector(
    devtools(
      createComputed((state: StoreState) => ({
        orderedGroups: groupSelectors.selectAll(state),
      }))((set, get) => ({
        ...defaultState,
        ...groupEntitySlice.initialState,
        ...groupEntitySlice.createActions(set),

        fetch: async (options = {}) => {
          if (!options.prefetch) {
            set({ isFetching: true });
          }

          try {
            const { data, pagination, abilities } = await groupApi.list({
              limit: 100,
              page: 1,
              sortBy: "name",
              sortOrder: "asc",
            });
            const groups = data.map((group: any) => ({
              id: group.id,
              name: group.name,
              description: typeof group.description === "string" ? group.description : null,
              members: Array.isArray(group.members) ? group.members : [],
            }));
            get().setAll(groups);
            return groups;
          } finally {
            set({ isFetching: false });
          }
        },

        create: async (data) => {
          set({ isSaving: true });
          try {
            // FIXME: remove any type
            const response = (await groupApi.create({
              ...data,
              workspaceId: useWorkspaceStore.getState().currentWorkspace?.id || "",
              description: typeof data.description === "string" ? data.description : null,
            })) as any;
            const group: GroupEntity = {
              id: response.id,
              name: response.name,
              description: typeof response.description === "string" ? response.description : null,
              members: Array.isArray(response.members) ? response.members : [],
            };
            get().addOne(group);
            return group;
          } finally {
            set({ isSaving: false });
          }
        },

        update: async (id, data) => {
          set({ isSaving: true });
          try {
            const response = (await groupApi.update(id, {
              id,
              name: data.name || "",
              description: typeof data.description === "string" ? data.description : null,
              validUntil: null,
            })) as any;
            const group: GroupEntity = {
              id: response.id,
              name: response.name,
              description: typeof response.description === "string" ? response.description : null,
              members: Array.isArray(response.members) ? response.members : [],
            };
            get().updateOne({ id, changes: group });
            return group;
          } finally {
            set({ isSaving: false });
          }
        },

        delete: async (id) => {
          set({ isSaving: true });
          try {
            await groupApi.delete(id);
            get().removeOne(id);
          } finally {
            set({ isSaving: false });
          }
        },

        addUser: async (groupId, userId) => {
          set({ isSaving: true });
          try {
            const response = (await groupApi.addUser(groupId, { id: groupId, userId })) as any;
            const group: GroupEntity = {
              id: response.id,
              name: response.name,
              description: typeof response.description === "string" ? response.description : null,
              members: Array.isArray(response.members) ? response.members : [],
            };
            get().updateOne({ id: groupId, changes: group });
            return group;
          } finally {
            set({ isSaving: false });
          }
        },

        removeUser: async (groupId, userId) => {
          set({ isSaving: true });
          try {
            const response = (await groupApi.removeUser(groupId, userId)) as any;
            const group: GroupEntity = {
              id: response.id,
              name: response.name,
              description: typeof response.description === "string" ? response.description : null,
              members: Array.isArray(response.members) ? response.members : [],
            };
            get().updateOne({ id: groupId, changes: group });
            return group;
          } finally {
            set({ isSaving: false });
          }
        },

        fetchWorkspaceGroups: async (workspaceId: string) => {
          try {
            const { data } = await groupApi.list({
              limit: 100,
              page: 1,
              sortBy: "name",
              sortOrder: "asc",
            });
            const groups = data.map((group: any) => ({
              id: group.id,
              name: group.name,
              description: typeof group.description === "string" ? group.description : null,
              members: Array.isArray(group.members) ? group.members : [],
            }));
            get().setAll(groups);
            return groups;
          } catch (error) {
            console.error("Failed to fetch workspace groups:", error);
            return [];
          }
        },
      })),
      {
        name: "groupStore",
      },
    ),
  ),
);

export default useGroupStore;
