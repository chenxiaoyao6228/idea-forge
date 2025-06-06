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
  getInfo: async (data: DocShareInfoDto) => request.post<DocShareInfoDto, ShareInfoResponse>("/api/shares/info", data),

  /**
   * List shares
   */
  list: async (data: ShareListRequest) => request.post<ShareListRequest, ShareListResponse>("/api/shares/list", data),

  /**
   * Create a new share
   */
  create: async (data: CreateShareDto) => request.post<CreateShareDto, ShareCreateResponse>("/api/shares/create", data),

  /**
   * Update an existing share
   */
  update: async (data: UpdateShareDto) => request.post<UpdateShareDto, ShareUpdateResponse>("/api/shares/update", data),

  /**
   * Revoke a share
   */
  revoke: async (data: RevokeShareDto) => request.post<RevokeShareDto, ShareRevokeResponse>("/api/shares/revoke", data),

  /**
   * List documents shared with me
   */
  listSharedWithMe: async (data: ListSharedWithMeDto) => request.post<ListSharedWithMeDto, ShareListResponse>("/api/shares/sharedWithMe", data),

  /**
   * List documents shared by me
   */
  listSharedByMe: async (data: ListSharedByMeDto) => request.post<ListSharedByMeDto, ShareListResponse>("/api/shares/sharedByMe", data),
};
