import { useEffect } from "react";
import type { Socket } from "socket.io-client";
import type { NotificationWebSocketEvent } from "@idea/contracts";
import { addNotification, updateNotification, setUnreadCount } from "@/stores/notification-store";
import { notificationApi } from "@/apis/notification";

/**
 * WebSocket event handler for notification events
 * Listens to notification.create, notification.update, and notification.action_resolved events
 */
export function useNotificationWebsocketEvents(socket: Socket | null) {
  useEffect(() => {
    if (!socket) return;

    // Handler for new notifications
    const handleNotificationCreate = (event: NotificationWebSocketEvent) => {
      if (event.type === "notification.create") {
        console.log("[notification-events]: Received notification.create", event.payload);
        addNotification(event.payload);

        // Refetch unread count
        notificationApi.getUnreadCount().then(setUnreadCount).catch(console.error);
      }
    };

    // Handler for notification updates (e.g., mark as read)
    const handleNotificationUpdate = (event: NotificationWebSocketEvent) => {
      if (event.type === "notification.update") {
        console.log("[notification-events]: Received notification.update", event.payload);
        updateNotification(event.payload.id, event.payload);

        // Refetch unread count
        notificationApi.getUnreadCount().then(setUnreadCount).catch(console.error);
      }
    };

    // Handler for action resolution (approve/reject/accept/decline)
    const handleNotificationActionResolved = (event: NotificationWebSocketEvent) => {
      if (event.type === "notification.action_resolved") {
        console.log("[notification-events]: Received notification.action_resolved", event.payload);
        updateNotification(event.payload.id, event.payload);

        // Refetch unread count
        notificationApi.getUnreadCount().then(setUnreadCount).catch(console.error);
      }
    };

    // Register event listeners
    socket.on("notification.create", handleNotificationCreate);
    socket.on("notification.update", handleNotificationUpdate);
    socket.on("notification.action_resolved", handleNotificationActionResolved);

    // Cleanup function
    return () => {
      socket.off("notification.create", handleNotificationCreate);
      socket.off("notification.update", handleNotificationUpdate);
      socket.off("notification.action_resolved", handleNotificationActionResolved);
    };
  }, [socket]);
}
