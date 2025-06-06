import request from "@/lib/request";
import type {
  DocShareInfoDto,
  CreateShareDto,
  UpdateShareDto,
  RevokeShareDto,
  ShareListRequest,
  ListSharedWithMeDto,
  ListSharedByMeDto,
  ShareInfoResponse,
  ShareListResponse,
  ShareCreateResponse,
  ShareUpdateResponse,
  ShareRevokeResponse,
} from "contracts";

export const shareApi = {
  /**
   * Get share information
   */
  getInfo: async (id: string) => request.get<void, ShareInfoResponse>(`/api/shares/${id}`),

  /**
   * List shares
   */
  list: async (data: ShareListRequest) => request.get<ShareListRequest, ShareListResponse>("/api/shares", { params: data }),

  /**
   * Create a new share
   */
  create: async (data: CreateShareDto) => request.post<CreateShareDto, ShareCreateResponse>("/api/shares", data),

  /**
   * Update an existing share
   */
  update: async (id: string, data: UpdateShareDto) => request.patch<UpdateShareDto, ShareUpdateResponse>(`/api/shares/${id}`, data),

  /**
   * Revoke a share
   */
  revoke: async (id: string) => request.delete<void, ShareRevokeResponse>(`/api/shares/${id}`),

  /**
   * List documents shared with me
   */
  listSharedWithMe: async (data: ListSharedWithMeDto) => request.get<ListSharedWithMeDto, ShareListResponse>("/api/shares/shared-with-me", { params: data }),

  /**
   * List documents shared by me
   */
  listSharedByMe: async (data: ListSharedByMeDto) => request.get<ListSharedByMeDto, ShareListResponse>("/api/shares/shared-by-me", { params: data }),
};
