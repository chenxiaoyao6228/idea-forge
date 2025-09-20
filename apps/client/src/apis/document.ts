import request from "@/lib/request";
import type {
  CommonDocumentResponse,
  CreateDocumentDto,
  UpdateDocumentDto,
  MoveDocumentsDto,
  DocSharesResponse,
  UpdateSharePermissionDto,
  ShareDocumentDto,
  RemoveShareDto,
  UpdateCoverDto,
  TrashDocumentResponse,
  SearchDocumentDto,
  SearchDocumentResponse,
  DuplicateDocumentResponse,
  ListDocumentResponse,
  ListDocumentDto,
  PermissionListRequest,
  SharedWithMeResponse,
} from "@idea/contracts";

export const documentApi = {
  list: async (data: ListDocumentDto) => {
    return request.post<ListDocumentDto, ListDocumentResponse>(`/api/documents/list`, data);
  },
  // ================ share doc ========================
  shareDocument: (id: string, data: ShareDocumentDto) => request.post<ShareDocumentDto, DocSharesResponse>(`/api/documents/${id}/share`, data),
  getSharedWithMe: async (query) => {
    return request.get<null, SharedWithMeResponse>(`/api/documents/shared-with-me`, { params: query });
  },
  getDocumentShares: (id: string) => request.get<null, DocSharesResponse>(`/api/share-documents/${id}`),

  // ================ others ========================

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
    return request.get<null, any>(`/api/documents/${id}`);
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

  moveDocument: (dto: MoveDocumentsDto) => request.post<MoveDocumentsDto, any>("/api/documents/move", dto),

  updateCover: (id: string, dto: UpdateCoverDto) => request.patch<UpdateCoverDto, CommonDocumentResponse>(`/api/documents/${id}/cover`, dto),
  removeCover: (id: string) => request.delete<null, CommonDocumentResponse>(`/api/documents/${id}/cover`),

  getTrash: () => request.get<null, TrashDocumentResponse[]>("/api/documents/trash"),

  restore: (id: string) => request.post<null, CommonDocumentResponse>(`/api/documents/${id}/restore`),

  permanentDelete: (id: string) => request.delete<null, void>(`/api/documents/${id}/permanent`),

  emptyTrash: () => request.post<null, { success: boolean }>("/api/documents/trash/empty"),

  search: async (params: SearchDocumentDto) => {
    const searchParams = new URLSearchParams();
    if (params.keyword) searchParams.set("keyword", params.keyword);
    if (params.sort) searchParams.set("sort", params.sort);
    if (params.order) searchParams.set("order", params.order);
    if (params.page) searchParams.set("page", params.page.toString());
    if (params.limit) searchParams.set("limit", params.limit.toString());

    return request.get<null, SearchDocumentResponse>(`/api/documents/search?${searchParams.toString()}`);
  },

  duplicate: (id: string) => request.post<null, DuplicateDocumentResponse>(`/api/documents/${id}/duplicate`),
};
