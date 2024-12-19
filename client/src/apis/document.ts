import request from "@/lib/request";
import type { CommonDocumentResponse, CreateDocumentDto, UpdateDocumentDto } from "shared";

export const documentApi = {
  getTree: async (parentId?: string) => {
    const searchParams = new URLSearchParams();
    if (parentId) searchParams.set("parentId", parentId);
    const url = `/api/documents/tree${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
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
};
