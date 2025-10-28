import { create } from "zustand";
import { useMemo } from "react";
import { toast } from "sonner";
import { subscriptionApi } from "@/apis/subscription";
import useRequest from "@ahooksjs/use-request";
import { useRefCallback } from "@/hooks/use-ref-callback";
import type { CreateSubscriptionRequest } from "@idea/contracts";

export interface SubscriptionEntity {
  id: string;
  userId: string;
  documentId: string | null;
  subspaceId: string | null;
  event: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Minimal store - only state
const useSubscriptionStore = create<{
  subscriptions: SubscriptionEntity[];
}>((set) => ({
  subscriptions: [],
}));

// Basic data access
export const useSubscriptions = () => {
  return useSubscriptionStore((state) => state.subscriptions);
};

// Computed values - get subscriptions for a specific document
export const useDocumentSubscriptions = (documentId?: string) => {
  const subscriptions = useSubscriptionStore((state) => state.subscriptions);
  return useMemo(() => {
    if (!documentId) return [];
    return subscriptions.filter((sub) => sub.documentId === documentId && !sub.deletedAt);
  }, [subscriptions, documentId]);
};

// Computed values - get subscriptions for a specific subspace
export const useSubspaceSubscriptions = (subspaceId?: string) => {
  const subscriptions = useSubscriptionStore((state) => state.subscriptions);
  return useMemo(() => {
    if (!subspaceId) return [];
    return subscriptions.filter((sub) => sub.subspaceId === subspaceId && !sub.deletedAt);
  }, [subscriptions, subspaceId]);
};

// Check if user is subscribed to a document (direct subscription only)
export const useIsSubscribedToDocument = (documentId?: string) => {
  const subscriptions = useSubscriptionStore((state) => state.subscriptions);
  if (!documentId) return false;
  return subscriptions.some((sub) => sub.documentId === documentId && !sub.deletedAt);
};

// Check if user is subscribed to a document or its parent subspace
// This matches the backend logic in subscription.service.ts:getSubscribersForDocument
export const useIsSubscribedToDocumentOrSubspace = (documentId?: string, subspaceId?: string) => {
  const subscriptions = useSubscriptionStore((state) => state.subscriptions);
  if (!documentId) return false;

  // Check for document-level subscription (active or soft-deleted)
  const documentSub = subscriptions.find((sub) => sub.documentId === documentId);
  const hasDocumentSubscription = documentSub && !documentSub.deletedAt;
  const hasDocumentUnsubscription = documentSub?.deletedAt;

  // If there's an active document subscription, return true
  if (hasDocumentSubscription) return true;

  // If there's a document-level unsubscription, return false (even if subscribed to subspace)
  if (hasDocumentUnsubscription) return false;

  // Check if subscribed to the parent subspace (and no explicit document unsubscription)
  if (subspaceId) {
    const hasSubspaceSubscription = subscriptions.some((sub) => sub.subspaceId === subspaceId && !sub.deletedAt);
    if (hasSubspaceSubscription) return true;
  }

  return false;
};

// Check if user is subscribed to a subspace
export const useIsSubscribedToSubspace = (subspaceId?: string) => {
  const subscriptions = useSubscriptionStore((state) => state.subscriptions);
  if (!subspaceId) return false;
  return subscriptions.some((sub) => sub.subspaceId === subspaceId && !sub.deletedAt);
};

// Fetch all user subscriptions
export const useFetchSubscriptions = () => {
  return useRequest(
    async (filters?: { documentId?: string; subspaceId?: string }) => {
      try {
        const response = await subscriptionApi.list(filters || {});
        const newSubscriptions = response.subscriptions.map((sub) => ({
          ...sub,
          createdAt: new Date(sub.createdAt),
          updatedAt: new Date(sub.updatedAt),
          deletedAt: sub.deletedAt ? new Date(sub.deletedAt) : null,
        }));

        useSubscriptionStore.setState({ subscriptions: newSubscriptions });
        return newSubscriptions;
      } catch (error: any) {
        console.error("Failed to fetch subscriptions:", error);
        toast.error("Failed to fetch subscriptions", {
          description: error.message,
        });
        throw error;
      }
    },
    {
      manual: true,
    },
  );
};

// Create subscription (subscribe)
export const useCreateSubscription = () => {
  return useRequest(
    async (params: CreateSubscriptionRequest) => {
      try {
        const response = await subscriptionApi.create(params);
        const subscription: SubscriptionEntity = {
          id: response.id,
          userId: response.userId,
          documentId: response.documentId,
          subspaceId: response.subspaceId,
          event: response.event,
          deletedAt: response.deletedAt ? new Date(response.deletedAt) : null,
          createdAt: new Date(response.createdAt),
          updatedAt: new Date(response.updatedAt),
        };

        // Update or add to store
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

        toast.success("Subscribed successfully");
        return subscription;
      } catch (error: any) {
        console.error("Failed to subscribe:", error);
        toast.error("Failed to subscribe", {
          description: error.message,
        });
        throw error;
      }
    },
    {
      manual: true,
    },
  );
};

// Delete subscription (unsubscribe)
export const useDeleteSubscription = () => {
  return useRequest(
    async (subscriptionId: string) => {
      try {
        await subscriptionApi.delete({ subscriptionId });

        // Remove from store
        useSubscriptionStore.setState((state) => ({
          subscriptions: state.subscriptions.filter((sub) => sub.id !== subscriptionId),
        }));

        toast.success("Unsubscribed successfully");
        return subscriptionId;
      } catch (error: any) {
        console.error("Failed to unsubscribe:", error);
        toast.error("Failed to unsubscribe", {
          description: error.message,
        });
        throw error;
      }
    },
    {
      manual: true,
    },
  );
};

// Find subscription by document ID (includes soft-deleted)
export const useFindDocumentSubscription = () => {
  const subscriptions = useSubscriptionStore((state) => state.subscriptions);

  return useRefCallback((documentId?: string) => {
    if (!documentId) return undefined;
    // Return any document subscription (active or soft-deleted)
    return subscriptions.find((sub) => sub.documentId === documentId);
  });
};

// Find subscription by subspace ID
export const useFindSubspaceSubscription = () => {
  const subscriptions = useSubscriptionStore((state) => state.subscriptions);

  return useRefCallback((subspaceId?: string) => {
    if (!subspaceId) return undefined;
    return subscriptions.find((sub) => sub.subspaceId === subspaceId && !sub.deletedAt);
  });
};

// Toggle document subscription
// Note: This needs to be called with subspaceId to properly handle subspace subscriptions
export const useToggleDocumentSubscription = (documentId?: string, subspaceId?: string) => {
  const subscriptions = useSubscriptionStore((state) => state.subscriptions);
  const createSubscription = useCreateSubscription();
  const deleteSubscription = useDeleteSubscription();

  return useRefCallback(async () => {
    if (!documentId) {
      throw new Error("Document ID is required");
    }

    // Find existing document subscription (active or soft-deleted)
    const documentSub = subscriptions.find((sub) => sub.documentId === documentId);
    const hasDocumentSubscription = documentSub && !documentSub.deletedAt;
    const hasDocumentUnsubscription = documentSub?.deletedAt;

    // Check if subscribed via subspace
    const hasSubspaceSubscription = subspaceId ? subscriptions.some((sub) => sub.subspaceId === subspaceId && !sub.deletedAt) : false;

    // Determine effective subscription state
    const isEffectivelySubscribed = hasDocumentSubscription || (hasSubspaceSubscription && !hasDocumentUnsubscription);

    if (isEffectivelySubscribed) {
      // Unsubscribe
      if (hasDocumentSubscription && documentSub) {
        // Has direct document subscription - soft delete it
        await deleteSubscription.run(documentSub.id);
      } else if (hasSubspaceSubscription) {
        // Subscribed via subspace - create a soft-deleted document subscription to exclude this doc
        const newSub = await createSubscription.run({ documentId, event: "documents.update" });
        // Immediately soft-delete it to act as an exclusion
        if (newSub) {
          await deleteSubscription.run(newSub.id);
        }
      }
    } else {
      // Subscribe or re-subscribe
      if (hasDocumentUnsubscription && documentSub) {
        // Had unsubscribed from this doc - restore the subscription by deleting and recreating
        // (or we could update deletedAt to null, but creating new is cleaner)
        await createSubscription.run({ documentId, event: "documents.update" });
      } else {
        // No previous subscription - create new
        await createSubscription.run({ documentId, event: "documents.update" });
      }
    }
  });
};

// Toggle subspace subscription
export const useToggleSubspaceSubscription = (subspaceId?: string) => {
  const isSubscribed = useIsSubscribedToSubspace(subspaceId);
  const findSubscription = useFindSubspaceSubscription();
  const createSubscription = useCreateSubscription();
  const deleteSubscription = useDeleteSubscription();

  return useRefCallback(async () => {
    if (!subspaceId) {
      throw new Error("Subspace ID is required");
    }

    if (isSubscribed) {
      const subscription = findSubscription(subspaceId);
      if (subscription) {
        await deleteSubscription.run(subscription.id);
      }
    } else {
      await createSubscription.run({ subspaceId, event: "documents.update" });
    }
  });
};

// Publish document update
export const usePublishDocument = () => {
  return useRequest(
    async (documentId: string) => {
      try {
        const response = await subscriptionApi.publishDocument(documentId);
        toast.success(response.message || "Update published successfully", {
          description: `${response.subscriberCount} subscribers will be notified`,
        });
        return response;
      } catch (error: any) {
        console.error("Failed to publish document:", error);
        toast.error("Failed to publish update", {
          description: error.message,
        });
        throw error;
      }
    },
    {
      manual: true,
    },
  );
};

export default useSubscriptionStore;
