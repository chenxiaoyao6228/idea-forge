import { Draft, produce } from "immer";
import { PartialExcept } from "@/types";
import { set, get } from "lodash-es";

export interface EntityState<T extends { id: string }> {
  ids: string[];
  entities: Record<string, T>;
}

export type Update<T, K extends keyof T> = {
  id: T[K];
  changes: Partial<Omit<T, K>>;
};

const createEntitySlice = <T extends { id: string }>() => {
  const slice = {
    ids: [] as string[],
    entities: {} as Record<string, T>,

    addOne: (entity: T) => (state: EntityState<T>) =>
      produce(state, (draft) => {
        if (!draft.entities[entity.id]) {
          draft.ids.push(entity.id);
        }
        draft.entities[entity.id] = entity as Draft<T>;
      }),

    addMany: (entities: T[]) => (state: EntityState<T>) =>
      produce(state, (draft) => {
        entities.forEach((entity) => {
          if (!draft.entities[entity.id]) {
            draft.ids.push(entity.id);
          }
          draft.entities[entity.id] = entity as Draft<T>;
        });
      }),

    setOne: (entity: T) => (state: EntityState<T>) =>
      produce(state, (draft) => {
        if (!draft.entities[entity.id]) {
          draft.ids.push(entity.id);
        }
        draft.entities[entity.id] = entity as Draft<T>;
      }),

    setMany: (entities: T[]) => (state: EntityState<T>) =>
      produce(state, (draft) => {
        entities.forEach((entity) => {
          if (!draft.entities[entity.id]) {
            draft.ids.push(entity.id);
          }
          draft.entities[entity.id] = entity as Draft<T>;
        });
      }),

    setAll: (entities: T[]) => (state: EntityState<T>) =>
      produce(state, (draft) => {
        draft.ids = entities.map((e) => e.id);
        draft.entities = {};
        entities.forEach((entity) => {
          draft.entities[entity.id] = entity as Draft<T>;
        });
      }),

    updateOne: (update: Update<T, "id">) => (state: EntityState<T>) =>
      produce(state, (draft) => {
        if (draft.entities[update.id]) {
          draft.entities[update.id] = {
            ...draft.entities[update.id],
            ...update.changes,
          } as Draft<T>;
        }
      }),

    updateMany: (updates: Update<T, "id">[]) => (state: EntityState<T>) =>
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

    upsertOne: (entity: T) => (state: EntityState<T>) =>
      produce(state, (draft) => {
        if (!draft.entities[entity.id]) {
          draft.ids.push(entity.id);
        }
        draft.entities[entity.id] = entity as Draft<T>;
      }),

    upsertMany: (entities: T[]) => (state: EntityState<T>) =>
      produce(state, (draft) => {
        entities.forEach((entity) => {
          if (!draft.entities[entity.id]) {
            draft.ids.push(entity.id);
          }
          draft.entities[entity.id] = entity as Draft<T>;
        });
      }),

    removeOne: (id: string) => (state: EntityState<T>) =>
      produce(state, (draft) => {
        draft.ids = draft.ids.filter((entityId) => entityId !== id);
        delete draft.entities[id];
      }),

    removeMany: (ids: string[]) => (state: EntityState<T>) =>
      produce(state, (draft) => {
        draft.ids = draft.ids.filter((id) => !ids.includes(id));
        ids.forEach((id) => {
          delete draft.entities[id];
        });
      }),

    removeAll: () => (state: EntityState<T>) =>
      produce(state, (draft) => {
        draft.ids = [];
        draft.entities = {};
      }),

    updateDeep: (id: string, path: string | string[], value: any | ((current: any) => any)) => (state: EntityState<T>) =>
      produce(state, (draft) => {
        if (!draft.entities[id]) return;

        const entity = draft.entities[id];
        if (typeof value === "function") {
          const currentValue = get(entity, path);
          set(entity as object, path, value(currentValue));
        } else {
          set(entity as object, path, value);
        }
      }),

    getDeep: (id: string, path: string | string[], defaultValue?: any) => (state: EntityState<T>) => {
      const entity = state.entities[id];
      if (!entity) return defaultValue;
      return get(entity, path, defaultValue);
    },

    // state and selectors
    getState: () => ({ ids: slice.ids, entities: slice.entities }),

    getSelectors: () => ({
      selectAll: (state: EntityState<T>) => state.ids.map((id) => state.entities[id]),
      selectById: (id: string) => (state: EntityState<T>) => state.entities[id],
      selectIds: (state: EntityState<T>) => state.ids,
      selectEntities: (state: EntityState<T>) => state.entities,
      selectTotal: (state: EntityState<T>) => state.ids.length,
    }),

    getActions: (set: any) => ({
      addOne: (entity: T) => set(slice.addOne(entity)),
      addMany: (entities: T[]) => set(slice.addMany(entities)),
      setOne: (entity: T) => set(slice.setOne(entity)),
      setMany: (entities: T[]) => set(slice.setMany(entities)),
      setAll: (entities: T[]) => set(slice.setAll(entities)),
      updateOne: (update: Update<T, "id">) => set(slice.updateOne(update)),
      updateMany: (updates: Update<T, "id">[]) => set(slice.updateMany(updates)),
      upsertOne: (entity: T) => set(slice.upsertOne(entity)),
      upsertMany: (entities: T[]) => set(slice.upsertMany(entities)),
      removeOne: (id: string) => set(slice.removeOne(id)),
      removeMany: (ids: string[]) => set(slice.removeMany(ids)),
      removeAll: () => set(slice.removeAll()),
      updateDeep: (id: string, path: string | string[], value: any | ((current: any) => any)) => set(slice.updateDeep(id, path, value)),
      getDeep: (id: string, path: string | string[], defaultValue?: any) => slice.getDeep(id, path, defaultValue),
    }),
  };

  return slice;
};

export default createEntitySlice;
