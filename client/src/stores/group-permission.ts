import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import { groupPermissionApi } from "@/apis/group-permission";
import type { GroupPermissionResponse, GroupPermissionListRequest, DocGroupPermissionDto } from "contracts";
import createEntitySlice, { EntityState, EntityActions } from "./utils/entity-slice";
import useDocumentStore from "./document";

interface FetchOptions {
  force?: boolean;
  prefetch?: boolean;
}

export interface GroupPermissionEntity extends GroupPermissionResponse {}

interface State {
  isFetching: boolean;
  isLoaded: boolean;
}

interface Action {
  // API actions
  list: (query: GroupPermissionListRequest, options?: FetchOptions) => Promise<GroupPermissionResponse[]>;
  addPermission: (data: DocGroupPermissionDto) => Promise<GroupPermissionResponse>;
  removePermission: (id: string) => Promise<void>;

  // Helper methods
  getByGroupId: (groupId: string) => GroupPermissionResponse[];
  getByDocumentId: (documentId: string) => GroupPermissionResponse[];
}

const defaultState: State = {
  isFetching: false,
  isLoaded: false,
};

const groupPermissionEntitySlice = createEntitySlice<GroupPermissionEntity>();
export const groupPermissionSelectors = groupPermissionEntitySlice.selectors;

type StoreState = State & Action & EntityState<GroupPermissionEntity> & EntityActions<GroupPermissionEntity>;

const useGroupPermissionStore = create<StoreState>()(
  subscribeWithSelector(
    devtools(
      createComputed((state: StoreState) => ({
        allGroupPermissions: groupPermissionSelectors.selectAll(state),
      }))((set, get) => ({
        ...defaultState,
        ...groupPermissionEntitySlice.initialState,
        ...groupPermissionEntitySlice.createActions(set),

        list: async (query, options = {}) => {
          if (!options.force && get().isLoaded) return groupPermissionSelectors.selectAll(get());

          set({ isFetching: true });
          try {
            // FIXME: ts error
            const response = (await groupPermissionApi.listGroupPermissions(query)) as any;

            const {
              data: { groupPermissions, documents },
            } = response;

            get().setAll(groupPermissions);

            // Add documents to document store
            const { upsertMany } = useDocumentStore.getState();
            upsertMany(documents);

            set({ isLoaded: true });
            return groupPermissions;
          } finally {
            set({ isFetching: false });
          }
        },

        addPermission: async (data) => {
          const response = await groupPermissionApi.addGroupPermission(data);
          get().addOne(response.data);
          return response.data;
        },

        removePermission: async (id) => {
          await groupPermissionApi.removeGroupPermission(id);
          get().removeOne(id);
        },

        getByGroupId: (groupId) => {
          return groupPermissionSelectors.selectAll(get()).filter((permission) => permission.groupId === groupId);
        },

        getByDocumentId: (documentId) => {
          return groupPermissionSelectors.selectAll(get()).filter((permission) => permission.documentId === documentId);
        },
      })),
      {
        name: "groupPermissionStore",
      },
    ),
  ),
);

export default useGroupPermissionStore;
