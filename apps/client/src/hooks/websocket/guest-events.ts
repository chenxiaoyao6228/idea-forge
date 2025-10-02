import { useEffect } from "react";
import { Socket } from "socket.io-client";
import { useFetchWorkspaces } from "@/stores/workspace-store";
import { useFetchGuests } from "@/stores/guest-collaborators-store";
import { toast } from "sonner";
import { SocketEvents } from "@/lib/websocket";

/**
 * WebSocket event handlers for guest collaborator events
 *
 * Handles real-time notifications for:
 * - Guest invitations (refresh workspace list for invited user)
 * - Guest acceptance (refresh guest list for workspace admins)
 * - Guest removal (switch workspace for removed guest, refresh list for admins)
 */
export function useGuestEventHandlers(socket: Socket | null) {
  const { run: fetchWorkspaces } = useFetchWorkspaces();
  const { run: fetchGuests } = useFetchGuests();

  useEffect(() => {
    if (!socket) return;

    const handleGuestInvited = (data: { guestId: string; workspaceId: string; guestEmail: string; invitedByUserId: string }) => {
      console.log("[WebSocket] Guest invited:", data);

      // Refresh workspace list to show the new pending invitation
      fetchWorkspaces();

      // Show toast notification
      toast.info("You've been invited as a guest to a workspace", {
        description: "Check your workspace list to accept the invitation",
        duration: 5000,
      });
    };

    const handleGuestAccepted = (data: { guestId: string; userId: string; workspaceId: string; guestEmail: string }) => {
      console.log("[WebSocket] Guest accepted:", data);

      // Refresh guest list for workspace admins
      fetchGuests();
    };

    const handleGuestRemoved = (data: { guestId: string; userId: string; workspaceId: string; removedByUserId: string }) => {
      console.log("[WebSocket] Guest removed:", data);

      // Get current workspace
      const currentWorkspaceId = localStorage.getItem("workspaceId");

      if (currentWorkspaceId === data.workspaceId) {
        // User was removed from current workspace - need to switch
        toast.error("You have been removed from this workspace", {
          description: "Redirecting to another workspace...",
          duration: 3000,
        });

        // Refresh workspace list and redirect
        setTimeout(async () => {
          await fetchWorkspaces();

          // Navigate to home which will trigger workspace switch logic
          window.location.href = "/";
        }, 1000);
      } else {
        // Just refresh workspace list (they might be viewing guest management panel)
        fetchWorkspaces();
        fetchGuests();
      }
    };

    // Register event handlers
    socket.on(SocketEvents.GUEST_INVITED, handleGuestInvited);
    socket.on(SocketEvents.GUEST_ACCEPTED, handleGuestAccepted);
    socket.on(SocketEvents.GUEST_REMOVED, handleGuestRemoved);

    // Cleanup function
    return () => {
      socket.off(SocketEvents.GUEST_INVITED, handleGuestInvited);
      socket.off(SocketEvents.GUEST_ACCEPTED, handleGuestAccepted);
      socket.off(SocketEvents.GUEST_REMOVED, handleGuestRemoved);
    };
  }, [socket, fetchWorkspaces, fetchGuests]);
}
