import { z } from "zod";

export const DEFAULT_LIMIT = 10;

export const basePagerSchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).optional().default(DEFAULT_LIMIT),
  page: z.coerce.number().int().min(1).optional().default(1),
  sortBy: z.string().default("createdAt"),
  sortOrder: z
    .string()
    .or(z.enum(["asc", "desc"]))
    .optional(),

  cursor: z
    .string()
    .or(z.null())
    .or(z.boolean())
    .transform((val) => (val === null || val === false || val === true ? "" : val))
    .optional(),
  query: z.string().optional(),
});


export type BasePageResult<T> = {
  pagination: {
    page: number;
    limit: number;
    total: number;
  },
  data: T[]
  permissions?: Record<string, Record<string, boolean>>
}