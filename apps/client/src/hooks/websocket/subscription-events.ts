import { useEffect } from "react";
import { Socket } from "socket.io-client";
import useSubscriptionStore, { type SubscriptionEntity } from "@/stores/subscription-store";
import { SocketEvents } from "@/lib/websocket";
import { toast } from "sonner";

/**
 * Hook to handle subscription-related WebSocket events
 * Returns cleanup function for proper event listener removal
 */
export function useSubscriptionWebsocketEvents(socket: Socket | null) {
  useEffect(() => {
    if (!socket) return;

    const onSubscriptionCreated = (event: { subscription: SubscriptionEntity }) => {
      console.log(`[websocket]: Received event ${SocketEvents.SUBSCRIPTION_CREATED}:`, event);

      const subscription: SubscriptionEntity = {
        ...event.subscription,
        createdAt: new Date(event.subscription.createdAt),
        updatedAt: new Date(event.subscription.updatedAt),
        deletedAt: event.subscription.deletedAt ? new Date(event.subscription.deletedAt) : null,
      };

      // Add or update subscription in store
      useSubscriptionStore.setState((state) => {
        const existingIndex = state.subscriptions.findIndex((sub) => sub.id === subscription.id);
        if (existingIndex >= 0) {
          // Update existing
          const newSubscriptions = [...state.subscriptions];
          newSubscriptions[existingIndex] = subscription;
          return { subscriptions: newSubscriptions };
        }
        // Add new
        return { subscriptions: [...state.subscriptions, subscription] };
      });
    };

    const onSubscriptionDeleted = (event: { subscriptionId: string }) => {
      console.log(`[websocket]: Received event ${SocketEvents.SUBSCRIPTION_DELETED}:`, event);

      // Remove subscription from store
      useSubscriptionStore.setState((state) => ({
        subscriptions: state.subscriptions.filter((sub) => sub.id !== event.subscriptionId),
      }));
    };

    const onDocumentPublished = (event: { documentId: string; publisherId: string; isFirstPublish: boolean }) => {
      console.log(`[websocket]: Received event ${SocketEvents.DOCUMENT_PUBLISHED}:`, event);

      // Show toast for first publish
      if (event.isFirstPublish) {
        toast.info("Document published", {
          description: "Collaborators have been auto-subscribed",
        });
      }

      // Note: The actual notification will come through the notification system
      // This event is just for UI feedback
    };

    // Register event listeners
    socket.on(SocketEvents.SUBSCRIPTION_CREATED, onSubscriptionCreated);
    socket.on(SocketEvents.SUBSCRIPTION_DELETED, onSubscriptionDeleted);
    socket.on(SocketEvents.DOCUMENT_PUBLISHED, onDocumentPublished);

    // Create cleanup function
    return () => {
      socket.off(SocketEvents.SUBSCRIPTION_CREATED, onSubscriptionCreated);
      socket.off(SocketEvents.SUBSCRIPTION_DELETED, onSubscriptionDeleted);
      socket.off(SocketEvents.DOCUMENT_PUBLISHED, onDocumentPublished);
    };
  }, [socket]);
}
