import { z } from "zod";

// Subscription event types
export const SubscriptionEventType = {
  DOCUMENT_UPDATE: "documents.update",
} as const;

export type SubscriptionEventType = (typeof SubscriptionEventType)[keyof typeof SubscriptionEventType];

// Base Subscription schema
export const SubscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  documentId: z.string().nullable(),
  subspaceId: z.string().nullable(),
  event: z.string(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

// Create subscription request
export const CreateSubscriptionRequestSchema = z
  .object({
    documentId: z.string().optional(),
    subspaceId: z.string().optional(),
    event: z.string().default(SubscriptionEventType.DOCUMENT_UPDATE),
  })
  .refine(
    (data) => {
      // Exactly one of documentId OR subspaceId must be present
      return (data.documentId && !data.subspaceId) || (!data.documentId && data.subspaceId);
    },
    {
      message: "Exactly one of documentId or subspaceId must be provided",
    },
  );

export type CreateSubscriptionRequest = z.infer<typeof CreateSubscriptionRequestSchema>;

export const CreateSubscriptionResponseSchema = SubscriptionSchema;
export type CreateSubscriptionResponse = z.infer<typeof CreateSubscriptionResponseSchema>;

// List subscriptions request
export const ListSubscriptionsRequestSchema = z.object({
  documentId: z.string().optional(),
  subspaceId: z.string().optional(),
});

export type ListSubscriptionsRequest = z.infer<typeof ListSubscriptionsRequestSchema>;

export const ListSubscriptionsResponseSchema = z.object({
  subscriptions: z.array(SubscriptionSchema),
  total: z.number(),
});

export type ListSubscriptionsResponse = z.infer<typeof ListSubscriptionsResponseSchema>;

// Get subscription info request
export const GetSubscriptionRequestSchema = z.object({
  subscriptionId: z.string(),
});

export type GetSubscriptionRequest = z.infer<typeof GetSubscriptionRequestSchema>;

export const GetSubscriptionResponseSchema = SubscriptionSchema;
export type GetSubscriptionResponse = z.infer<typeof GetSubscriptionResponseSchema>;

// Delete subscription request
export const DeleteSubscriptionRequestSchema = z.object({
  subscriptionId: z.string(),
});

export type DeleteSubscriptionRequest = z.infer<typeof DeleteSubscriptionRequestSchema>;

export const DeleteSubscriptionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export type DeleteSubscriptionResponse = z.infer<typeof DeleteSubscriptionResponseSchema>;

// Publish document request
export const PublishDocumentRequestSchema = z.object({
  documentId: z.string(),
});

export type PublishDocumentRequest = z.infer<typeof PublishDocumentRequestSchema>;

export const PublishDocumentResponseSchema = z.object({
  success: z.boolean(),
  subscriberCount: z.number(),
  message: z.string().optional(),
});

export type PublishDocumentResponse = z.infer<typeof PublishDocumentResponseSchema>;

// ============================================
// Helper Types for Background Jobs
// ============================================

/**
 * Document published job data
 */
export interface DocumentPublishedJobData {
  documentId: string;
  publisherId: string;
  workspaceId: string;
  isFirstPublish: boolean;
}
