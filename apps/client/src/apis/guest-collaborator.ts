import type {
  InviteGuestRequest,
  InviteGuestToWorkspaceRequest,
  BatchInviteGuestsRequest,
  UpdateGuestPermissionRequest,
  GetWorkspaceGuestsRequest,
  RemoveGuestFromDocumentRequest,
  GuestCollaboratorResponse,
  WorkspaceGuestsResponse,
} from "@idea/contracts";
import request from "@/lib/request";

export const guestCollaboratorsApi = {
  inviteGuestToWorkspace: async (data: InviteGuestToWorkspaceRequest) => {
    return request.post<InviteGuestToWorkspaceRequest, GuestCollaboratorResponse>("/api/guest-collaborators/workspace/invite", data);
  },

  acceptGuestInvitation: async (guestId: string) => {
    return request.post<void, { message: string }>(`/api/guest-collaborators/${guestId}/accept`, {});
  },

  inviteGuest: async (data: InviteGuestRequest) => {
    return request.post<InviteGuestRequest, GuestCollaboratorResponse>("/api/guest-collaborators/invite", data);
  },

  batchInviteGuests: async (data: BatchInviteGuestsRequest) => {
    return request.post<BatchInviteGuestsRequest, GuestCollaboratorResponse[]>("/api/guest-collaborators/batch-invite", data);
  },

  getWorkspaceGuests: async (workspaceId: string, params?: Omit<GetWorkspaceGuestsRequest, "workspaceId">) => {
    return request.post<GetWorkspaceGuestsRequest, WorkspaceGuestsResponse>("/api/guest-collaborators/workspace/guests", {
      workspaceId,
      ...params,
    });
  },

  getDocumentGuests: async (documentId: string) => {
    return request.get<void, GuestCollaboratorResponse[]>(`/api/guest-collaborators/document/${documentId}`);
  },

  updateGuestPermission: async (guestId: string, data: UpdateGuestPermissionRequest) => {
    return request.patch<UpdateGuestPermissionRequest, GuestCollaboratorResponse>(`/api/guest-collaborators/${guestId}/permission`, data);
  },

  removeGuestFromWorkspace: async (guestId: string) => {
    return request.delete<void, { message: string }>(`/api/guest-collaborators/${guestId}`);
  },

  removeGuestFromDocument: async (guestId: string, documentId: string) => {
    return request.delete<void, { message: string }>(`/api/guest-collaborators/${guestId}/documents/${documentId}`);
  },
};
