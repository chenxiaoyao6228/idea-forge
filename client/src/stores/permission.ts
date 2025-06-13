import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import createEntitySlice, { EntityState, EntityActions } from "./utils/entity-slice";
import { permissionApi } from "@/apis/permission";

export interface PermissionEntity {
  id: string; // resourceId (document, workspace, etc.)
  abilities: Record<string, boolean>;
  resourceType?: string; // DOCUMENT, WORKSPACE, SUBSPACE
}

interface State {
  isFetching: boolean;
}

interface Action {
  // API actions
  fetchResourcePermissions: (resourceType: string, resourceId: string) => Promise<void>;

  // Helper methods
  setPermissions: (permissions: Record<string, Record<string, boolean>>) => void;
  updatePermission: (id: string, abilities: Record<string, boolean>) => void;
  getAbilities: (id: string) => Record<string, boolean>;
  hasPermission: (id: string, action: string) => boolean;
  clear: () => void;
}

const defaultState: State = {
  isFetching: false,
};

const defaultAbilities = Object.freeze({
  read: false,
  update: false,
  delete: false,
  share: false,
  comment: false,
} as Record<string, boolean>);

const permissionEntitySlice = createEntitySlice<PermissionEntity>();
export const permissionSelectors = permissionEntitySlice.selectors;

type StoreState = State & Action & EntityState<PermissionEntity> & EntityActions<PermissionEntity>;

const usePermissionStore = create<StoreState>()(
  subscribeWithSelector(
    devtools(
      createComputed((state: StoreState) => ({
        allPermissions: permissionSelectors.selectAll(state),
      }))((set, get) => ({
        ...defaultState,
        ...permissionEntitySlice.initialState,
        ...permissionEntitySlice.createActions(set),

        fetchResourcePermissions: async (resourceType: string, resourceId: string) => {
          set({ isFetching: true });
          try {
            const response = await permissionApi.getResourcePermissions(resourceType, resourceId);
            get().updatePermission(resourceId, response.data);
          } finally {
            set({ isFetching: false });
          }
        },

        setPermissions: (permissions: Record<string, Record<string, boolean>>) => {
          const entities = Object.entries(permissions).map(([id, abilities]) => ({
            id,
            abilities: { ...defaultAbilities, ...abilities },
          }));
          get().setAll(entities);
        },

        updatePermission: (id: string, abilities: Record<string, boolean>) => {
          get().upsertOne({
            id,
            abilities: { ...defaultAbilities, ...abilities },
          });
        },

        getAbilities: (id: string) => {
          const permission = get().entities[id];
          return permission ? permission.abilities : defaultAbilities;
        },

        hasPermission: (id: string, action: string) => {
          const abilities = get().getAbilities(id);
          return abilities[action] || false;
        },

        clear: () => {
          get().removeAll();
        },
      })),
      {
        name: "permissionStore",
      },
    ),
  ),
);

export default usePermissionStore;
