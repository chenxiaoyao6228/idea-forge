import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import { groupApi } from "@/apis/group";
import createEntitySlice, { EntityState, EntityActions } from "./utils/entity-slice";

export interface GroupEntity {
  id: string;
  name: string;
  description?: string;
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
  // API actions
  fetch: (options?: FetchOptions) => Promise<GroupEntity[]>;
  create: (data: { name: string; description?: string }) => Promise<GroupEntity>;
  update: (id: string, data: { name?: string; description?: string }) => Promise<GroupEntity>;
  delete: (id: string) => Promise<void>;

  // Helper methods
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
            const response = await groupApi.list({
              limit: 100,
              page: 1,
              sortBy: "name",
              sortOrder: "asc",
            });
            const groups = response.data.map((group) => ({
              id: group.id,
              name: group.name,
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
            const response = await groupApi.create({
              ...data,
              workspaceId: "default", // TODO: Get from workspace context
              description: data.description || null,
            });
            const group = {
              id: response.data.id,
              name: response.data.name,
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
            const response = await groupApi.update(id, {
              id,
              name: data.name || "",
              description: data.description || null,
              validUntil: null,
            });
            const group = {
              id: response.data.id,
              name: response.data.name,
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
      })),
      {
        name: "groupStore",
      },
    ),
  ),
);

export default useGroupStore;
