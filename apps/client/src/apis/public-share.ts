import request from "@/lib/request";
import type {
  GetOrCreatePublicShareDto,
  GetOrCreatePublicShareResponse,
  PublicShareResponse,
  UpdatePublicShareDto,
  UpdatePublicShareResponse,
  RevokePublicShareResponse,
  ListPublicSharesDto,
  ListPublicSharesResponse,
  PublicDocumentResponse,
} from "@idea/contracts";

/**
 * API client for public share operations
 */
export const publicShareApi = {
  /**
   * Create or get existing public share for a document
   * POST /api/public-shares
   */
  create: (dto: GetOrCreatePublicShareDto) =>
    request.post<GetOrCreatePublicShareDto, GetOrCreatePublicShareResponse>("/api/public-shares", dto),

  /**
   * Get public share by document ID
   * GET /api/public-shares/doc/:docId
   */
  getByDocId: (docId: string) =>
    request.get<null, PublicShareResponse | null>(`/api/public-shares/doc/${docId}`),

  /**
   * Update public share settings
   * PATCH /api/public-shares/doc/:docId
   */
  update: (docId: string, dto: UpdatePublicShareDto) =>
    request.patch<UpdatePublicShareDto, UpdatePublicShareResponse>(`/api/public-shares/doc/${docId}`, dto),

  /**
   * Revoke public share
   * DELETE /api/public-shares/doc/:docId
   */
  revoke: (docId: string) =>
    request.delete<RevokePublicShareResponse>(`/api/public-shares/doc/${docId}`),

  /**
   * Regenerate public link (revoke + create new)
   * POST /api/public-shares/:docId/regenerate
   */
  regenerate: (docId: string) =>
    request.post<null, GetOrCreatePublicShareResponse>(`/api/public-shares/${docId}/regenerate`),

  /**
   * List workspace public shares
   * GET /api/public-shares/workspace/:workspaceId
   */
  listWorkspaceShares: (params: ListPublicSharesDto) =>
    request.get<null, ListPublicSharesResponse>("/api/public-shares/workspace", { params }),

  /**
   * Access public document (anonymous)
   * GET /api/public/:token
   */
  getPublicDocument: (token: string) =>
    request.get<null, PublicDocumentResponse>(`/api/public/${token}`),

  /**
   * Access child document in public share
   * GET /api/public/:token/doc/:documentId
   */
  getPublicNestedDocument: (token: string, documentId: string) =>
    request.get<null, PublicDocumentResponse>(`/api/public/${token}/doc/${documentId}`),
};
