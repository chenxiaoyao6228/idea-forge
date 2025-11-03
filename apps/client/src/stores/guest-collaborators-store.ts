import { create } from "zustand";
import { useMemo } from "react";
import { orderBy } from "lodash-es";
import { toast } from "sonner";
import useRequest from "@ahooksjs/use-request";
import type {
  GuestCollaboratorResponse,
  InviteGuestRequest,
  InviteGuestToWorkspaceRequest,
  BatchInviteGuestsRequest,
  UpdateGuestPermissionRequest,
  GetWorkspaceGuestsRequest,
} from "@idea/contracts";
import { guestCollaboratorsApi } from "@/apis/guest-collaborator";
import { showConfirmModal } from '@/components/ui/confirm-modal';
import useWorkspaceStore from "./workspace-store";

// Store state only - no business logic in store
const useGuestCollaboratorsStore = create<{
  guests: GuestCollaboratorResponse[];
  guestLoaded: boolean;
  // Pagination state
  page: number;
  limit: number;
  total: number;
  isLoading: boolean;
  error: string | null;
}>((set) => ({
  guests: [],
  page: 1,
  limit: 1000,
  total: 0,
  isLoading: false,
  error: null,
  guestLoaded: false,
}));

// Computed values using useMemo
export const useOrderedGuests = () => {
  const guests = useGuestCollaboratorsStore((state) => state.guests);
  return useMemo(() => orderBy(guests, ["createdAt"], ["desc"]), [guests]);
};

// Simple store actions using vanilla JS
export const addGuest = (guest: GuestCollaboratorResponse) =>
  useGuestCollaboratorsStore.setState((state) => ({
    guests: [...state.guests, guest],
  }));

export const removeGuest = (guestId: string) =>
  useGuestCollaboratorsStore.setState((state) => ({
    guests: state.guests.filter((guest) => guest.id !== guestId),
  }));

export const updateGuest = (guestId: string, updates: Partial<GuestCollaboratorResponse>) => {
  useGuestCollaboratorsStore.setState((state) => {
    const updatedGuests = state.guests.map((guest) => {
      if (guest.id === guestId) {
        // If updates include documents, merge them with existing documents
        if (updates.documents) {
          const updatedDocuments = updates.documents
            .flatMap((newDoc) => {
              const existingDocIndex = guest.documents?.findIndex((doc) => doc.documentId === newDoc.documentId);
              if (existingDocIndex !== undefined && existingDocIndex >= 0 && guest.documents) {
                // Update existing document permission
                const updatedDoc = { ...guest.documents[existingDocIndex], ...newDoc };
                const newDocuments = [...guest.documents];
                newDocuments[existingDocIndex] = updatedDoc;
                return [newDocuments];
              }
              // Add new document permission
              return [[...(guest.documents || []), newDoc]];
            })
            .flat();

          return {
            ...guest,
            ...updates,
            documents: updatedDocuments,
          };
        }

        // No documents in updates, just merge other properties
        return { ...guest, ...updates };
      }
      return guest;
    });
    return { guests: updatedGuests };
  });
};

export const setGuests = (guests: GuestCollaboratorResponse[]) => useGuestCollaboratorsStore.setState({ guests });

export const useIsGuestCollaborator = () => {
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);

  return useMemo(() => {
    return currentWorkspace?.accessLevel === "guest";
  }, [currentWorkspace?.accessLevel]);
};

// Hook for fetching workspace guests
export const useFetchGuests = () => {
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const workspaceId = currentWorkspace?.id;

  return useRequest(
    async (params?: Omit<GetWorkspaceGuestsRequest, "workspaceId">) => {
      try {
        if (!workspaceId) {
          return [];
        }

        const response = await guestCollaboratorsApi.getWorkspaceGuests(workspaceId, params);
        setGuests(response.data);
        useGuestCollaboratorsStore.setState({
          page: response.pagination.page,
          total: response.pagination.total,
          guestLoaded: true,
        });
        return response.data;
      } catch (error) {
        console.error("Failed to fetch guests:", error);
        toast.error("Failed to load guests");
        useGuestCollaboratorsStore.setState({ error: (error as Error).message });
        throw error;
      }
    },
    { manual: true },
  );
};

// Hook for fetching document-specific guests
export const useFetchDocumentGuests = () => {
  return useRequest(
    async (documentId: string) => {
      try {
        const response = await guestCollaboratorsApi.getDocumentGuests(documentId);
        setGuests(response);
        return response;
      } catch (error) {
        console.error("Failed to fetch document guests:", error);
        toast.error("Failed to load document guests");
        useGuestCollaboratorsStore.setState({ error: (error as Error).message });
        throw error;
      }
    },
    { manual: true },
  );
};

// Hook for inviting guests
export const useInviteGuest = () => {
  return useRequest(
    async (params: InviteGuestRequest) => {
      try {
        const response = await guestCollaboratorsApi.inviteGuest(params);
        // Optimistic update
        addGuest(response);
        toast.success("Guest invited successfully");
        return response;
      } catch (error) {
        console.error("Failed to invite guest:", error);
        toast.error("Failed to invite guest");
        throw error;
      }
    },
    { manual: true },
  );
};

// Hook for batch inviting guests
export const useBatchInviteGuests = () => {
  return useRequest(
    async (params: BatchInviteGuestsRequest) => {
      try {
        const response = await guestCollaboratorsApi.batchInviteGuests(params);
        // Add all guests to store
        response.forEach((guest) => addGuest(guest));
        toast.success(`${response.length} guests added successfully`);
        return response;
      } catch (error) {
        console.error("Failed to batch invite guests:", error);
        toast.error("Failed to add guests");
        throw error;
      }
    },
    { manual: true },
  );
};

// Hook for updating guest permissions
export const useUpdateGuestPermission = () => {
  const { run: updateGuestPermission, ...rest } = useRequest(
    async (params: { guestId: string } & UpdateGuestPermissionRequest) => {
      const { guestId, ...data } = params;
      try {
        const response = await guestCollaboratorsApi.updateGuestPermission(guestId, data);

        // The API returns the guest with only the updated document in the documents array
        // We need to merge this with existing documents in the store
        useGuestCollaboratorsStore.setState((state) => {
          const updatedGuests = state.guests.map((guest) => {
            if (guest.id === guestId && response.documents && response.documents.length > 0) {
              const updatedDoc = response.documents[0];
              const existingDocIndex = guest.documents.findIndex((doc) => doc.documentId === updatedDoc.documentId);

              let updatedDocuments: any;
              if (existingDocIndex >= 0) {
                // Update existing document
                updatedDocuments = [...guest.documents];
                updatedDocuments[existingDocIndex] = updatedDoc;
              } else {
                // Add new document
                updatedDocuments = [...guest.documents, updatedDoc];
              }

              return {
                ...guest,
                ...response,
                documents: updatedDocuments,
              };
            }
            return guest;
          });
          return { guests: updatedGuests };
        });

        toast.success("Permission updated successfully");
        return response;
      } catch (error) {
        console.error("Failed to update permission:", error);
        toast.error("Failed to update permission");
        throw error;
      }
    },
    { manual: true },
  );

  return {
    ...rest,
    run: updateGuestPermission,
  };
};

// Hook for removing guest from workspace
export const useRemoveGuest = () => {
  return (guestId: string, guestName: string) => {
    showConfirmModal({
      title: "Remove Guest from Workspace",
      description: `Are you sure you want to remove '${guestName}' from this workspace? They will lose access to all documents in this workspace.`,
      confirmVariant: "destructive",
      onConfirm: async () => {
        try {
          // Call the API directly instead of the hook to avoid double execution
          await guestCollaboratorsApi.removeGuestFromWorkspace(guestId);
          // Remove from store
          removeGuest(guestId);
          toast.success("Guest removed successfully");
          return true;
        } catch (error) {
          console.error("Failed to remove guest:", error);
          toast.error("Failed to remove guest");
          return false;
        }
      },
    });
  };
};

// Hook for removing guest from specific document
export const useRemoveGuestFromDocument = () => {
  const { run: fetchGuests, loading: isFetchingGuests } = useFetchGuests();
  const { run: removeGuestFromDocument, loading: isRemovingGuestFromDocument } = useRequest(
    async (params: { guestId: string; documentId: string }) => {
      const { guestId, documentId } = params;
      try {
        await guestCollaboratorsApi.removeGuestFromDocument(guestId, documentId);
        // Update guest in store to remove the document
        const currentGuests = useGuestCollaboratorsStore.getState().guests;
        const guest = currentGuests.find((g) => g.id === guestId);
        if (guest) {
          const updatedGuest = {
            ...guest,
            documents: guest.documents.filter((doc) => doc.documentId !== documentId),
          };
          updateGuest(guestId, updatedGuest);
        }

        fetchGuests();
        toast.success("Guest access removed successfully");
      } catch (error) {
        console.error("Failed to remove guest access:", error);
        toast.error("Failed to remove guest access");
        throw error;
      }
    },
    { manual: true },
  );

  return {
    loading: isFetchingGuests || isRemovingGuestFromDocument,
    run: (params: { guestId: string; documentId: string; documentTitle?: string }) => {
      const title = params.documentTitle || "this document";
      showConfirmModal({
        title: "Remove Document Access",
        description: `Are you sure you want to remove access to '${title}' for this guest?`,
        confirmVariant: "destructive",
        onConfirm: async () => {
          try {
            await removeGuestFromDocument(params);
            return true;
          } catch (error) {
            console.error("Failed to remove document access:", error);
            toast.error("Failed to remove guest access");
            return false;
          }
        },
      });
    },
  };
};

// Hook for inviting guest to workspace (without document)
export const useInviteGuestToWorkspace = () => {
  return useRequest(
    async (params: InviteGuestToWorkspaceRequest) => {
      try {
        const response = await guestCollaboratorsApi.inviteGuestToWorkspace(params);
        addGuest(response);
        toast.success("Guest invited to workspace successfully");
        return response;
      } catch (error) {
        console.error("Failed to invite guest to workspace:", error);
        toast.error("Failed to invite guest");
        throw error;
      }
    },
    { manual: true },
  );
};

// Hook for accepting guest invitation
export const useAcceptGuestInvitation = () => {
  return useRequest(
    async (guestId: string) => {
      try {
        await guestCollaboratorsApi.acceptGuestInvitation(guestId);
        toast.success("Invitation accepted successfully");
        return true;
      } catch (error) {
        console.error("Failed to accept invitation:", error);
        toast.error("Failed to accept invitation");
        throw error;
      }
    },
    { manual: true },
  );
};

// Hook for promoting guest to member
export const usePromoteGuest = () => {
  return (guestId: string, guestName: string) => {
    showConfirmModal({
      title: "Promote Guest to Member",
      description: `Are you sure you want to promote '${guestName}' as workspace member?`,
      confirmVariant: "default",
      onConfirm: async () => {
        try {
          await guestCollaboratorsApi.promoteGuestToMember(guestId);
          // Remove from guest store since they are now a member
          removeGuest(guestId);
          toast.success("Guest promoted to member successfully");
          return true;
        } catch (error) {
          console.error("Failed to promote guest:", error);
          toast.error("Failed to promote guest");
          return false;
        }
      },
    });
  };
};

export default useGuestCollaboratorsStore;
