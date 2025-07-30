import { StateCreator } from "zustand";

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNextPage: boolean;
  error: string | null;
}

export interface PaginationActions {
  setPage: (page: number) => void;
  nextPage: () => void;
  setLoading: (loading: boolean) => void;
  setLoadingMore: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPaginationMeta: (meta: { total: number; page: number; limit: number }) => void;
  resetPagination: () => void;
}

export interface PaginationSlice extends PaginationState, PaginationActions {}

const defaultPaginationState: PaginationState = {
  page: 1,
  limit: 20,
  total: 0,
  isLoading: false,
  isLoadingMore: false,
  hasNextPage: false,
  error: null,
};

export const createPaginationSlice: StateCreator<PaginationSlice, [], [], PaginationSlice> = (set, get) => ({
  ...defaultPaginationState,

  setPage: (page) => {
    set({ page });
  },

  nextPage: () => {
    const { page, hasNextPage } = get();
    if (hasNextPage) {
      set({ page: page + 1 });
    }
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  setLoadingMore: (isLoadingMore) => {
    set({ isLoadingMore });
  },

  setError: (error) => {
    set({ error });
  },

  setPaginationMeta: ({ total, page, limit }) => {
    const loaded = page * limit;
    const hasNextPage = loaded < total;
    set({ total, page, limit, hasNextPage });
  },

  resetPagination: () => {
    set(defaultPaginationState);
  },
});
