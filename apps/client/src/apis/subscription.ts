import request from "@/lib/request";
import type {
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
  ListSubscriptionsRequest,
  ListSubscriptionsResponse,
  GetSubscriptionRequest,
  GetSubscriptionResponse,
  DeleteSubscriptionRequest,
  DeleteSubscriptionResponse,
  PublishDocumentRequest,
  PublishDocumentResponse,
} from "@idea/contracts";

export const subscriptionApi = {
  /**
   * Create a subscription to a document or subspace
   */
  create: async (data: CreateSubscriptionRequest) => request.post<CreateSubscriptionRequest, CreateSubscriptionResponse>("/api/subscriptions/create", data),

  /**
   * List user's subscriptions with optional filtering
   */
  list: async (data: ListSubscriptionsRequest) => request.post<ListSubscriptionsRequest, ListSubscriptionsResponse>("/api/subscriptions/list", data),

  /**
   * Get a specific subscription by ID
   */
  getInfo: async (data: GetSubscriptionRequest) => request.post<GetSubscriptionRequest, GetSubscriptionResponse>("/api/subscriptions/info", data),

  /**
   * Delete a subscription (unsubscribe)
   */
  delete: async (data: DeleteSubscriptionRequest) => request.post<DeleteSubscriptionRequest, DeleteSubscriptionResponse>("/api/subscriptions/delete", data),

  /**
   * Publish a document update to notify subscribers
   */
  publishDocument: async (id: string) => request.post<void, PublishDocumentResponse>(`/api/documents/${id}/publish`),
};
