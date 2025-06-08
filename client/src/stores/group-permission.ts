import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import { groupPermissionApi } from "@/apis/group-permission";
import createEntitySlice, { EntityState, EntityActions } from "./utils/entity-slice";
import type { GroupPermissionResponse, DocGroupPermissionDto, GroupPermissionListRequest, GroupPermissionListResponse } from "contracts";
import useDocumentStore from "./document";
import { DocTypeSchema, DocVisibilitySchema } from "contracts";

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
  list: (query: GroupPermissionListRequest, options?: FetchOptions) => Promise<GroupPermissionResponse[]>;
  addPermission: (data: DocGroupPermissionDto) => Promise<GroupPermissionResponse>;
  removePermission: (id: string) => Promise<void>;

  // Helper methods
  getByGroupId: (groupId: string) => GroupPermissionResponse[];
  getByDocumentId: (documentId: string) => GroupPermissionResponse[];
}

const defaultState: State = {
  isFetching: false,
  isSaving: false,
  isLoaded: false,
};

const docGroupPermissionEntitySlice = createEntitySlice<GroupPermissionResponse>();
export const docGroupPermissionSelectors = docGroupPermissionEntitySlice.selectors;

type StoreState = State & Action & EntityState<GroupPermissionResponse> & EntityActions<GroupPermissionResponse>;
const useDocGroupPermissionStore = create<StoreState>()(
  subscribeWithSelector(
    devtools(
      createComputed((state: StoreState) => ({
        orderedPermissions: docGroupPermissionSelectors.selectAll(state),
      }))((set, get) => ({
        ...defaultState,
        ...docGroupPermissionEntitySlice.initialState,
        ...docGroupPermissionEntitySlice.createActions(set),
        // FIXME: if there are many of these, we need to use a better way to fetch them
        list: async (query: GroupPermissionListRequest, options = {}) => {
          if (!options.prefetch) {
            set({ isFetching: true });
          }

          try {
            const response = await groupPermissionApi.listGroupPermissions(query);
            get().setAll(response.data.groupPermissions);

            // Add documents to document store
            const { upsertMany } = useDocumentStore.getState();
            const documents = response.data.documents.map((doc) => ({
              id: doc.id,
              title: doc.title,
              content: "",
              workspaceId: "",
              type: DocTypeSchema.Enum.NOTE,
              visibility: DocVisibilitySchema.Enum.PRIVATE,
              parentId: doc.parentId,
              icon: doc.icon,
              createdAt: doc.createdAt,
              updatedAt: doc.updatedAt,
            }));
            upsertMany(documents);

            return response.data.groupPermissions;
          } finally {
            set({ isFetching: false });
          }
        },

        addPermission: async (data: DocGroupPermissionDto) => {
          set({ isSaving: true });
          try {
            const response = await groupPermissionApi.addGroupPermission(data);
            get().addOne(response);
            return response;
          } finally {
            set({ isSaving: false });
          }
        },

        removePermission: async (id: string) => {
          set({ isSaving: true });
          try {
            await groupPermissionApi.removeGroupPermission(id);
            get().removeOne(id);
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
