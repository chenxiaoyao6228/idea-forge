import request from "@/lib/request";
import type { CommonDocumentResponse, CreateDocumentDto, UpdateDocumentDto, MoveDocumentsDto } from "shared";

export const documentApi = {
  getTree: async (parentId?: string | null) => {
    const searchParams = new URLSearchParams();
    if (parentId) searchParams.set("parentId", parentId);
    const url = `/api/documents/tree${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    return request<null, CommonDocumentResponse[]>(url);
  },

  getDocument: async (id: string) => {
    return request.get<null, CommonDocumentResponse>(`/api/documents/${id}`);
  },

  getDocumentPath: async (documentId: string) => {
    const url = `/api/documents/${documentId}/path`;
    return request<null, CommonDocumentResponse[]>(url);
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
};
