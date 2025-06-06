import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import { groupApi } from "@/apis/group";
import createEntitySlice, { EntityState, EntityActions } from "./utils/entity-slice";
import { DocGroupPermissionResponse, DocGroupPermissionDto } from "contracts";

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
  fetch: (groupId: string, options?: FetchOptions) => Promise<DocGroupPermissionResponse[]>;
  addPermission: (groupId: string, data: DocGroupPermissionDto) => Promise<DocGroupPermissionResponse>;
  removePermission: (groupId: string, documentId: string) => Promise<void>;

  // Helper methods
  getByGroupId: (groupId: string) => DocGroupPermissionResponse[];
  getByDocumentId: (documentId: string) => DocGroupPermissionResponse[];
}

const defaultState: State = {
  isFetching: false,
  isSaving: false,
  isLoaded: false,
};

const docGroupPermissionEntitySlice = createEntitySlice<DocGroupPermissionResponse>();
export const docGroupPermissionSelectors = docGroupPermissionEntitySlice.selectors;

type StoreState = State & Action & EntityState<DocGroupPermissionResponse> & EntityActions<DocGroupPermissionResponse>;
const useDocGroupPermissionStore = create<StoreState>()(
  subscribeWithSelector(
    devtools(
      createComputed((state: StoreState) => ({
        orderedPermissions: docGroupPermissionSelectors.selectAll(state),
      }))((set, get) => ({
        ...defaultState,
        ...docGroupPermissionEntitySlice.initialState,
        ...docGroupPermissionEntitySlice.createActions(set),

        fetch: async (groupId: string, options = {}) => {
          if (!options.prefetch) {
            set({ isFetching: true });
          }

          try {
            const response = await groupApi.listGroupPermissions(groupId);
            get().setAll(response);
            return response;
          } finally {
            set({ isFetching: false });
          }
        },

        addPermission: async (groupId: string, data: DocGroupPermissionDto) => {
          set({ isSaving: true });
          try {
            const response = await groupApi.addGroupPermission(groupId, data);
            get().addOne(response);
            return response;
          } finally {
            set({ isSaving: false });
          }
        },

        removePermission: async (groupId: string, documentId: string) => {
          set({ isSaving: true });
          try {
            await groupApi.removeGroupPermission(groupId, documentId);
            const permissions = docGroupPermissionSelectors.selectAll(get());
            const toRemove = permissions.filter((p) => p.documentId === documentId && p.groupId === groupId);
            get().removeMany(toRemove.map((p) => p.id));
          } finally {
            set({ isSaving: false });
          }
        },

        getByGroupId: (groupId: string) => docGroupPermissionSelectors.selectAll(get()).filter((permission) => permission.groupId === groupId),

        getByDocumentId: (documentId: string) => docGroupPermissionSelectors.selectAll(get()).filter((permission) => permission.documentId === documentId),
      })),
      {
        name: "docGroupPermissionStore",
      },
    ),
  ),
);

export default useDocGroupPermissionStore;
