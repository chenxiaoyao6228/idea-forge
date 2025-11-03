import { z } from "zod";
import { BasePageResult, basePagerSchema } from "./_base";
import { Star } from "./prisma-type-generated";

// ===== DTO/Response =====

// Create star
export const createStarSchema = z.object({
  docId: z.string().cuid(),
});

export type CreateStarDto = z.infer<typeof createStarSchema>;

// Update star
export const updateStarSchema = z.object({
  index: z.string().optional(),
});

export type UpdateStarDto = z.infer<typeof updateStarSchema>;

// List stars
export const listStarSchema = basePagerSchema.extend({
  workspaceId: z.string().cuid(),
});
export type ListStarDto = z.infer<typeof listStarSchema>;

// Response types
export interface StarResponse {
  data: {
    stars: Star[];
  };
  permissions: Record<string, Record<string, boolean>>;
}

export type ListStarResponse = BasePageResult<StarResponse>;
