import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import { userPermissionApi } from "@/apis/user-permission";
import createEntitySlice, { EntityState, EntityActions } from "./utils/entity-slice";
import { UserPermissionResponse } from "contracts";
import useDocumentStore from "@/stores/document";

export interface UserPermissionEntity extends UserPermissionResponse {
  userId: number;
}

interface FetchOptions {
  force?: boolean;
  prefetch?: boolean;
}

interface State {
  isFetching: boolean;
  isSaving: boolean;
  isLoaded: boolean;
  currentUserId?: number;
  currentUserPermissions: UserPermissionResponse[];
}

interface Action {
  list: (userId: number, options?: FetchOptions) => Promise<void>;
  addPermission: (userId: number, data: UserPermissionEntity) => Promise<UserPermissionEntity>;
  removePermission: (userId: number, documentId: string) => Promise<void>;
  getByDocumentId: (documentId: string) => UserPermissionEntity[];
}

const defaultState: State = {
  isFetching: false,
  isSaving: false,
  isLoaded: false,
  currentUserId: undefined,
  currentUserPermissions: [],
};

const docUserPermissionEntitySlice = createEntitySlice<UserPermissionEntity>();
export const docUserPermissionSelectors = docUserPermissionEntitySlice.selectors;

type StoreState = State & Action & EntityState<UserPermissionEntity> & EntityActions<UserPermissionEntity>;
const useDocUserPermissionStore = create<StoreState>()(
  subscribeWithSelector(
    devtools(
      createComputed((state: StoreState) => ({
        orderedPermissions: docUserPermissionSelectors.selectAll(state),
      }))((set, get) => ({
        ...defaultState,
        ...docUserPermissionEntitySlice.initialState,
        ...docUserPermissionEntitySlice.createActions(set),

        list: async (userId: number, options = {}) => {
          if (!options.prefetch) set({ isFetching: true });
          try {
            const response = (await userPermissionApi.list({
              limit: 100,
              page: 1,
              sortBy: "createdAt",
            })) as any;
            const { userPermissions, documents } = response.data;

            // Store all permissions for other operations
            get().setAll(userPermissions);

            // Store current user's permissions
            const currentUserPermissions = userPermissions.filter((p) => p.userId === userId);

            set({
              currentUserId: userId,
              currentUserPermissions,
            });

            // Add documents to document store
            const { upsertMany } = useDocumentStore.getState();
            upsertMany(documents);
          } finally {
            set({ isFetching: false });
          }
        },

        addPermission: async (userId: number, data: UserPermissionEntity) => {
          set({ isSaving: true });
          try {
            const response = await userPermissionApi.create(data);
            get().addOne(response);
            if (userId === get().currentUserId) {
              set((state) => ({
                currentUserPermissions: [...state.currentUserPermissions, response],
              }));
            }
            return response;
          } finally {
            set({ isSaving: false });
          }
        },

        removePermission: async (userId: number, documentId: string) => {
          set({ isSaving: true });
          try {
            await userPermissionApi.delete(documentId);
            const permissions = docUserPermissionSelectors.selectAll(get());
            const toRemove = permissions.filter((p) => p.documentId === documentId && p.userId === userId);
            get().removeMany(toRemove.map((p) => p.id));
            if (userId === get().currentUserId) {
              set((state) => ({
                currentUserPermissions: state.currentUserPermissions.filter((p) => p.documentId !== documentId),
              }));
            }
          } finally {
            set({ isSaving: false });
          }
        },

        getByDocumentId: (documentId: string) => docUserPermissionSelectors.selectAll(get()).filter((permission) => permission.documentId === documentId),
      })),
      {
        name: "docUserPermissionStore",
      },
    ),
  ),
);

export default useDocUserPermissionStore;
