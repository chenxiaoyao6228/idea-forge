import { z } from "zod";

export const createStarSchema = z.object({
  docId: z.string().optional(),
  subspaceId: z.string().optional(),
}).refine(data => data.docId || data.subspaceId, {
  message: "Either docId or subspaceId must be provided",
});

export const updateStarSchema = z.object({
  index: z.string().optional(),
});

