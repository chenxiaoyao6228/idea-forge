import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import createEntitySlice, { EntityState, EntityActions } from "./utils/entity-slice";
import { permissionApi } from "@/apis/permission";

const STORE_NAME = "abilityStore";

/*
 * we don't need the UnifiedPermission Entity on the client
 * but the converted abilities
 */
export interface AbilityEntity {
  id: string; // resourceId (document, workspace, etc.)
  abilities: Record<string, boolean>;
  resourceType?: string; // DOCUMENT, WORKSPACE, SUBSPACE
}

interface State {
  isFetching: boolean;
}

interface Action {
  // API actions
  fetchResourceAbilities: (resourceType: string, resourceId: string) => Promise<void>;

  // Helper methods
  setAbilities: (permissions: Record<string, Record<string, boolean>>) => void;
  updateAbility: (id: string, abilities: Record<string, boolean>) => void;
  addMany: (permissions: any[]) => void;
  getAbilities: (id: string) => Record<string, boolean>;
  hasAbility: (id: string, action: string) => boolean;
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

const abilityEntitySlice = createEntitySlice<AbilityEntity>();
export const abilitySelectors = abilityEntitySlice.selectors;

type StoreState = State & Action & EntityState<AbilityEntity> & EntityActions<AbilityEntity>;

const useAbilityStore = create<StoreState>()(
  subscribeWithSelector(
    devtools(
      createComputed((state: StoreState) => ({
        allPermissions: abilitySelectors.selectAll(state),
      }))((set, get) => ({
        ...defaultState,
        ...abilityEntitySlice.initialState,
        ...abilityEntitySlice.createActions(set),

        fetchResourceAbilities: async (resourceType, resourceId) => {
          set({ isFetching: true });
          try {
            const response = await permissionApi.getResourcePermissions(resourceType, resourceId);
            get().updateAbility(resourceId, response.data);
          } finally {
            set({ isFetching: false });
          }
        },

        setAbilities: (permissions) => {
          const entities = Object.entries(permissions).map(([id, abilities]) => ({
            id,
            abilities: { ...defaultAbilities, ...abilities },
          }));
          get().setAll(entities);
        },

        updateAbility: (id, abilities) => {
          get().upsertOne({
            id,
            abilities: { ...defaultAbilities, ...abilities },
          });
        },

        addMany: (permissions) => {
          // Convert permissions array to abilities entities
          const entities = permissions.map((permission) => ({
            id: permission.resourceId,
            abilities: { ...defaultAbilities, ...permission.abilities },
            resourceType: permission.resourceType,
          }));
          get().upsertMany(entities);
        },

        getAbilities: (id) => {
          const permission = get().entities[id];
          return permission ? permission.abilities : defaultAbilities;
        },

        hasAbility: (id, action) => {
          const abilities = get().getAbilities(id);
          return abilities[action] || false;
        },

        clear: () => {
          get().removeAll();
        },
      })),
      {
        name: STORE_NAME,
      },
    ),
  ),
);

export default useAbilityStore;
