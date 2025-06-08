import { z } from "zod";
import { BasePageResult, basePagerSchema } from "./_base";

// Star schema
export const StarSchema = z.object({
  id: z.string().cuid(),
  docId: z.string().cuid().nullable(),
  subspaceId: z.string().cuid().nullable(),
  index: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  userId: z.string(),
});

export type Star = z.infer<typeof StarSchema>;

// Create star
export const createStarSchema = z.object({
  docId: z.string().cuid().optional(),
  subspaceId: z.string().cuid().optional(),
}).refine(data => data.docId || data.subspaceId, {
  message: "Either docId or subspaceId must be provided",
});

export type CreateStarDto = z.infer<typeof createStarSchema>;

// Update star
export const updateStarSchema = z.object({
  index: z.string().optional(),
});

export type UpdateStarDto = z.infer<typeof updateStarSchema>;

// List stars
export const listStarSchema = basePagerSchema;
export type ListStarDto = z.infer<typeof listStarSchema>;

// Response types
export interface StarResponse {
  data: {
    stars: Star[];
  };
  policies: any[];
}

export type ListStarResponse = BasePageResult<StarResponse>;

