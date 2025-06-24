import { Draft, produce } from "immer";
import { PartialExcept } from "@/types";

export interface EntityState<T extends { id: string }> {
  ids: string[];
  entities: Record<string, T>;
}

export type Update<T, K extends keyof T> = {
  id: T[K];
  changes: Partial<Omit<T, K>>;
};

export interface EntityActions<T extends { id: string }> {
  addOne: (entity: T) => void;
  addMany: (entities: T[]) => void;
  setOne: (entity: T) => void;
  setMany: (entities: T[]) => void;
  setAll: (entities: T[]) => void;
  updateOne: (update: Update<T, "id">) => void;
  updateMany: (updates: Update<T, "id">[]) => void;
  upsertOne: (entity: T) => void;
  upsertMany: (entities: T[]) => void;
  removeOne: (id: string) => void;
  removeMany: (ids: string[]) => void;
  removeAll: () => void;
  updateDeep: (id: string, path: string | string[], value: any | ((current: any) => any)) => void;
  getDeep: (id: string, path: string | string[], defaultValue?: any) => any;
}

export interface EntitySelectors<T extends { id: string }> {
  selectAll: (state: EntityState<T>) => T[];
  selectById: (state: EntityState<T>, id: string) => T | undefined;
  selectIds: (state: EntityState<T>) => string[];
  selectEntities: (state: EntityState<T>) => Record<string, T>;
  selectTotal: (state: EntityState<T>) => number;
}

export interface EntitySlice<T extends { id: string }> {
  initialState: EntityState<T>;
  selectors: EntitySelectors<T>;
  createActions: <S extends EntityState<T>>(set: (fn: (state: S) => S | Partial<S>) => void) => EntityActions<T>;
}

// Create a stable selector function
const createStableSelector = <T extends { id: string }, R>(selector: (state: EntityState<T>, ...args: any[]) => R) => {
  // Use WeakMap to cache results for each state
  const cache = new WeakMap<EntityState<T>, R>();

  return (state: EntityState<T>, ...args: any[]): R => {
    // Check cache
    const cached = cache.get(state);
    if (cached !== undefined) {
      return cached;
    }

    // Calculate new result
    const result = selector(state, ...args);
    // Cache result
    cache.set(state, result);
    return result;
  };
};

export function createEntitySlice<T extends { id: string }>(): EntitySlice<T> {
  const initialState: EntityState<T> = {
    ids: [],
    entities: {},
  };

  const selectors: EntitySelectors<T> = {
    selectAll: createStableSelector((state) => state.ids.map((id) => state.entities[id])),
    selectById: createStableSelector((state, id: string) => state.entities[id]),
    selectIds: createStableSelector((state) => state.ids),
    selectEntities: createStableSelector((state) => state.entities),
    selectTotal: createStableSelector((state) => state.ids.length),
  };

  const createActions = <S extends EntityState<T>>(set: (fn: (state: S) => S | Partial<S>) => void): EntityActions<T> => ({
    addOne: (entity) =>
      set((state) =>
        produce(state, (draft) => {
          if (!draft.entities[entity.id]) {
            draft.ids.push(entity.id);
          }
          draft.entities[entity.id] = entity as Draft<T>;
        }),
      ),

    addMany: (entities) =>
      set((state) =>
        produce(state, (draft) => {
          entities.forEach((entity) => {
            if (!draft.entities[entity.id]) {
              draft.ids.push(entity.id);
            }
            draft.entities[entity.id] = entity as Draft<T>;
          });
        }),
      ),

    setOne: (entity) =>
      set((state) =>
        produce(state, (draft) => {
          if (!draft.entities[entity.id]) {
            draft.ids.push(entity.id);
          }
          draft.entities[entity.id] = entity as Draft<T>;
        }),
      ),

    setMany: (entities) =>
      set((state) =>
        produce(state, (draft) => {
          entities.forEach((entity) => {
            if (!draft.entities[entity.id]) {
              draft.ids.push(entity.id);
            }
            draft.entities[entity.id] = entity as Draft<T>;
          });
        }),
      ),

    setAll: (entities) =>
      set((state) =>
        produce(state, (draft) => {
          draft.ids = entities.map((e) => e.id);
          draft.entities = {};
          entities.forEach((entity) => {
            draft.entities[entity.id] = entity as Draft<T>;
          });
        }),
      ),

    updateOne: (update) =>
      set((state) =>
        produce(state, (draft) => {
          if (draft.entities[update.id]) {
            draft.entities[update.id] = {
              ...draft.entities[update.id],
              ...update.changes,
            } as Draft<T>;
          }
        }),
      ),

    updateMany: (updates) =>
      set((state) =>
        produce(state, (draft) => {
          updates.forEach((update) => {
            if (draft.entities[update.id]) {
              draft.entities[update.id] = {
                ...draft.entities[update.id],
                ...update.changes,
              } as Draft<T>;
            }
          });
        }),
      ),

    upsertOne: (entity) =>
      set((state) =>
        produce(state, (draft) => {
          if (!draft.entities[entity.id]) {
            draft.ids.push(entity.id);
          }
          draft.entities[entity.id] = entity as Draft<T>;
        }),
      ),

    upsertMany: (entities) =>
      set((state) =>
        produce(state, (draft) => {
          if (!entities || !Array.isArray(entities)) return;

          entities.forEach((entity) => {
            if (!entity || !entity.id) return;

            if (!draft.entities[entity.id]) {
              draft.ids.push(entity.id);
            }
            draft.entities[entity.id] = entity as Draft<T>;
          });
        }),
      ),

    removeOne: (id) =>
      set((state) =>
        produce(state, (draft) => {
          draft.ids = draft.ids.filter((entityId) => entityId !== id);
          delete draft.entities[id];
        }),
      ),

    removeMany: (ids) =>
      set((state) =>
        produce(state, (draft) => {
          draft.ids = draft.ids.filter((id) => !ids.includes(id));
          ids.forEach((id) => {
            delete draft.entities[id];
          });
        }),
      ),

    removeAll: () =>
      set((state) =>
        produce(state, (draft) => {
          draft.ids = [];
          draft.entities = {};
        }),
      ),

    updateDeep: (id, path, value) =>
      set((state) =>
        produce(state, (draft) => {
          if (!draft.entities[id]) return;

          const entity = draft.entities[id];
          const pathArray = Array.isArray(path) ? path : path.split(".");

          let current: any = entity;
          for (let i = 0; i < pathArray.length - 1; i++) {
            const key = pathArray[i];
            if (!(key in current)) {
              current[key] = {};
            }
            current = current[key];
          }

          const lastKey = pathArray[pathArray.length - 1];
          if (typeof value === "function") {
            current[lastKey] = value(current[lastKey]);
          } else {
            current[lastKey] = value;
          }
        }),
      ),

    getDeep: (id, path, defaultValue) => {
      const entity = selectors.selectById(initialState, id);
      if (!entity) return defaultValue;
      const pathArray = Array.isArray(path) ? path : path.split(".");
      return pathArray.reduce((obj, key) => obj?.[key], entity) ?? defaultValue;
    },
  });

  return {
    initialState,
    selectors,
    createActions,
  };
}

export default createEntitySlice;
