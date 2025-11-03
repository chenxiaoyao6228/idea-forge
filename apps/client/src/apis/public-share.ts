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
   * POST /api/share
   */
  create: (dto: GetOrCreatePublicShareDto) => request.post<GetOrCreatePublicShareDto, GetOrCreatePublicShareResponse>("/api/share", dto),

  /**
   * Get public share by document ID
   * GET /api/share/doc/:docId
   */
  getByDocId: (docId: string) => request.get<null, PublicShareResponse | null>(`/api/share/doc/${docId}`),

  /**
   * Update public share settings
   * PATCH /api/share/doc/:docId
   */
  update: (docId: string, dto: UpdatePublicShareDto) => request.patch<UpdatePublicShareDto, UpdatePublicShareResponse>(`/api/share/doc/${docId}`, dto),

  /**
   * Revoke public share
   * DELETE /api/share/doc/:docId
   */
  revoke: (docId: string) => request.delete<RevokePublicShareResponse>(`/api/share/doc/${docId}`),

  /**
   * Regenerate public link (revoke + create new)
   * POST /api/share/:docId/regenerate
   */
  regenerate: (docId: string) => request.post<null, GetOrCreatePublicShareResponse>(`/api/share/${docId}/regenerate`),

  /**
   * List workspace public shares
   * GET /api/share/workspace/:workspaceId
   */
  listWorkspaceShares: (params: ListPublicSharesDto) => request.get<null, ListPublicSharesResponse>("/api/share/workspace", { params }),

  /**
   * Access public document (anonymous)
   * GET /api/share/:token
   */
  getPublicDocument: (token: string) => request.get<null, PublicDocumentResponse>(`/api/share/${token}`),

  /**
   * Access child document in public share
   * GET /api/share/:token/doc/:documentId
   */
  getPublicNestedDocument: (token: string, documentId: string) => request.get<null, PublicDocumentResponse>(`/api/share/${token}/doc/${documentId}`),
};
