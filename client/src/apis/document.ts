import request from "@/lib/request";
import type {
  CommonDocumentResponse,
  CreateDocumentDto,
  UpdateDocumentDto,
  MoveDocumentsDto,
  DetailSharedDocumentResponse,
  CommonSharedDocumentResponse,
  DocSharesResponse,
  UpdateSharePermissionDto,
  ShareDocumentDto,
  RemoveShareDto,
} from "shared";

export const documentApi = {
  getSharedDocuments: async () => {
    const url = `/api/share-documents/shared-docs`;
    return request<null, CommonSharedDocumentResponse[]>(url);
  },

  shareDocument: (data: ShareDocumentDto) => request.post<ShareDocumentDto, DocSharesResponse>(`/api/share-documents`, data),
  getDocShares: (id: string) => request.get<null, DocSharesResponse>(`/api/share-documents/${id}`),
  removeShare: (id: string, data: RemoveShareDto) => request.delete<DocSharesResponse>(`/api/share-documents/${id}`, { data }),
  updateSharePermission: (id: string, data: UpdateSharePermissionDto) =>
    request.patch<UpdateSharePermissionDto, DocSharesResponse>(`/api/share-documents/${id}`, data),

  getChildren: async (parentId?: string | null) => {
    const searchParams = new URLSearchParams();
    if (parentId) searchParams.set("parentId", parentId);
    const url = `/api/documents/children${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    return request<null, CommonDocumentResponse[]>(url);
  },

  getNestedTree: async (parentId?: string | null) => {
    const searchParams = new URLSearchParams();
    if (parentId) searchParams.set("parentId", parentId);
    const url = `/api/documents/tree${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    return request<null, CommonDocumentResponse[]>(url);
  },

  getDocument: async (id: string) => {
    return request.get<null, CommonDocumentResponse>(`/api/documents/${id}`);
  },

  create: async (data: CreateDocumentDto) => {
    return request.post<CreateDocumentDto, CommonDocumentResponse>("/api/documents", data);
  },

  delete: async (id: string) => {
    return request.delete<void>(`/api/documents/${id}`);
  },

  update: async (id: string, data: UpdateDocumentDto) => {
    return request.patch<UpdateDocumentDto, CommonDocumentResponse>(`/api/documents/${id}`, data);
  },

  getById: async (id: string) => {
    return request.get<CommonDocumentResponse>(`/api/documents/${id}`);
  },

  moveDocuments: (dto: MoveDocumentsDto) => request.post<MoveDocumentsDto, CommonDocumentResponse[]>("/api/documents/move", dto),

  generateDefaultCover: (id: string) => request.post<null, CommonDocumentResponse>(`/api/documents/${id}/generate-cover`),
  updateCover: (id: string, dto: { fileId?: string; scrollY?: number }) =>
    request.post<{ fileId?: string; scrollY?: number }, CommonDocumentResponse>(`/api/documents/${id}/cover`, dto),
  removeCover: (id: string) => request.delete<null, CommonDocumentResponse>(`/api/documents/${id}/cover`),
};
