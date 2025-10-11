import { create } from "zustand";
import useRequest from "@ahooksjs/use-request";
import { publicShareApi } from "@/apis/public-share";
import type { PublicShareResponse, GetOrCreatePublicShareDto } from "@idea/contracts";

interface PublicShareState {
  // State
  sharesByDocId: Record<string, PublicShareResponse>; // docId → share

  // Actions
  setShare: (docId: string, share: PublicShareResponse) => void;
  getShare: (docId: string) => PublicShareResponse | undefined;
  removeShare: (docId: string) => void;
  clearShares: () => void;
}

export const usePublicShareStore = create<PublicShareState>((set, get) => ({
  sharesByDocId: {},

  setShare: (docId, share) =>
    set((state) => ({
      sharesByDocId: { ...state.sharesByDocId, [docId]: share },
    })),

  getShare: (docId) => {
    return get().sharesByDocId[docId];
  },

  removeShare: (docId) =>
    set((state) => {
      const { [docId]: _, ...rest } = state.sharesByDocId;
      return { sharesByDocId: rest };
    }),

  clearShares: () => set({ sharesByDocId: {} }),
}));

// ============================================================================
// React hooks for API operations
// ============================================================================

/**
 * Hook to fetch public share by document ID
 */
export function useFetchPublicShare() {
  const setShare = usePublicShareStore((s) => s.setShare);

  return useRequest(
    async (docId: string) => {
      const response = await publicShareApi.getByDocId(docId);
      if (response) {
        setShare(docId, response);
      }
      return response;
    },
    { manual: true }
  );
}

/**
 * Hook to get or create public share
 */
export function useGetOrCreatePublicShare() {
  const setShare = usePublicShareStore((s) => s.setShare);

  return useRequest(
    async (dto: GetOrCreatePublicShareDto) => {
      const response = await publicShareApi.create(dto);
      setShare(dto.documentId, response.data);
      return response;
    },
    { manual: true }
  );
}

/**
 * Hook to revoke public share
 */
export function useRevokePublicShare() {
  const removeShare = usePublicShareStore((s) => s.removeShare);

  return useRequest(
    async (params: { id: string; docId: string }) => {
      await publicShareApi.revoke(params.docId);
      removeShare(params.docId);
      return { success: true };
    },
    { manual: true }
  );
}

/**
 * Hook to update public share expiration
 */
export function useUpdateExpiration() {
  const setShare = usePublicShareStore((s) => s.setShare);

  return useRequest(
    async (params: { id: string; docId: string; duration: any }) => {
      const response = await publicShareApi.update(params.docId, {
        duration: params.duration,
      });
      setShare(params.docId, response.data);
      return response;
    },
    { manual: true }
  );
}

/**
 * Hook to get public share from store by document ID
 */
export function usePublicShareByDocId(docId: string) {
  return usePublicShareStore((s) => s.sharesByDocId[docId]);
}
