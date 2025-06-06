import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import { userPermissionApi } from "@/apis/user-permission";
import createEntitySlice, { EntityState, EntityActions } from "./utils/entity-slice";
import { UserPermissionResponse, UserPermission } from "contracts";

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
  fetch: (userId: string, options?: FetchOptions) => Promise<UserPermissionResponse[]>;
  addPermission: (userId: string, data: UserPermission) => Promise<UserPermissionResponse>;
  removePermission: (userId: string, documentId: string) => Promise<void>;

  // Helper methods
  getByUserId: (userId: string) => UserPermissionResponse[];
  getByDocumentId: (documentId: string) => UserPermissionResponse[];
}

const defaultState: State = {
  isFetching: false,
  isSaving: false,
  isLoaded: false,
};

const docUserPermissionEntitySlice = createEntitySlice<UserPermissionResponse>();
export const docUserPermissionSelectors = docUserPermissionEntitySlice.selectors;

type StoreState = State & Action & EntityState<UserPermissionResponse> & EntityActions<UserPermissionResponse>;
const useDocUserPermissionStore = create<StoreState>()(
  subscribeWithSelector(
    devtools(
      createComputed((state: StoreState) => ({
        orderedPermissions: docUserPermissionSelectors.selectAll(state),
      }))((set, get) => ({
        ...defaultState,
        ...docUserPermissionEntitySlice.initialState,
        ...docUserPermissionEntitySlice.createActions(set),

        fetch: async (userId: string, options = {}) => {
          if (!options.prefetch) {
            set({ isFetching: true });
          }

          try {
            const response = await userPermissionApi.list(userId, {
              limit: 100,
              page: 1,
              sortBy: "createdAt",
            });
            const permissions = response.data;
            get().setAll(permissions);
            return permissions;
          } finally {
            set({ isFetching: false });
          }
        },

        addPermission: async (userId: string, data: UserPermission) => {
          set({ isSaving: true });
          try {
            const response = await userPermissionApi.create(userId, data);
            get().addOne(response);
            return response;
          } finally {
            set({ isSaving: false });
          }
        },

        removePermission: async (userId: string, documentId: string) => {
          set({ isSaving: true });
          try {
            await userPermissionApi.delete(userId, documentId);
            const permissions = docUserPermissionSelectors.selectAll(get());
            const toRemove = permissions.filter((p) => p.documentId === documentId && p.userId === userId);
            get().removeMany(toRemove.map((p) => p.id));
          } finally {
            set({ isSaving: false });
          }
        },

        getByUserId: (userId: string) => docUserPermissionSelectors.selectAll(get()).filter((permission) => permission.userId === userId),

        getByDocumentId: (documentId: string) => docUserPermissionSelectors.selectAll(get()).filter((permission) => permission.documentId === documentId),
      })),
      {
        name: "docUserPermissionStore",
      },
    ),
  ),
);

export default useDocUserPermissionStore;
