import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import { groupApi } from "@/apis/group";
import createEntitySlice, { EntityState, EntityActions } from "./utils/entity-slice";
import { Group } from "@/types/group";
import useDocGroupPermissionStore from "./group-permission";

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
  fetch: (options?: FetchOptions) => Promise<Group[]>;
  create: (data: { name: string; description?: string }) => Promise<Group>;
  update: (id: string, data: { name?: string; description?: string }) => Promise<Group>;
  delete: (id: string) => Promise<void>;

  // Helper methods
  inCollection: (collectionId: string, query?: string) => Group[];
  notInCollection: (collectionId: string, query?: string) => Group[];
  inDocument: (documentId: string, query?: string) => Group[];
  notInDocument: (documentId: string, query?: string) => Group[];
}

const defaultState: State = {
  isFetching: false,
  isSaving: false,
  isLoaded: false,
};

const groupEntitySlice = createEntitySlice<Group>();
export const groupSelectors = groupEntitySlice.selectors;

type StoreState = State & Action & EntityState<Group> & EntityActions<Group>;
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
              memberCount: group.members.length,
              createdAt: group.createdAt.toISOString(),
              updatedAt: group.updatedAt.toISOString(),
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
              validUntil: null,
            });
            const group = {
              id: response.data.id,
              name: response.data.name,
              memberCount: response.data.members.length,
              createdAt: response.data.createdAt.toISOString(),
              updatedAt: response.data.updatedAt.toISOString(),
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
              memberCount: response.data.members.length,
              createdAt: response.data.createdAt.toISOString(),
              updatedAt: response.data.updatedAt.toISOString(),
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

        inCollection: (collectionId: string, query = "") => {
          const permissions = useDocGroupPermissionStore.getState().getByGroupId(collectionId);
          const groupIds = permissions.map((permission) => permission.groupId);
          const groups = groupSelectors.selectAll(get()).filter((group) => groupIds.includes(group.id));
          return query ? groups.filter((group) => group.name.toLowerCase().includes(query.toLowerCase())) : groups;
        },

        notInCollection: (collectionId: string, query = "") => {
          const permissions = useDocGroupPermissionStore.getState().getByGroupId(collectionId);
          const groupIds = permissions.map((permission) => permission.groupId);
          const groups = groupSelectors.selectAll(get()).filter((group) => !groupIds.includes(group.id));
          return query ? groups.filter((group) => group.name.toLowerCase().includes(query.toLowerCase())) : groups;
        },

        inDocument: (documentId: string, query = "") => {
          const permissions = useDocGroupPermissionStore.getState().getByDocumentId(documentId);
          const groupIds = permissions.map((permission) => permission.groupId);
          const groups = groupSelectors.selectAll(get()).filter((group) => groupIds.includes(group.id));
          return query ? groups.filter((group) => group.name.toLowerCase().includes(query.toLowerCase())) : groups;
        },

        notInDocument: (documentId: string, query = "") => {
          const permissions = useDocGroupPermissionStore.getState().getByDocumentId(documentId);
          const groupIds = permissions.map((permission) => permission.groupId);
          const groups = groupSelectors.selectAll(get()).filter((group) => !groupIds.includes(group.id));
          return query ? groups.filter((group) => group.name.toLowerCase().includes(query.toLowerCase())) : groups;
        },
      })),
      {
        name: "groupStore",
      },
    ),
  ),
);

export default useGroupStore;
