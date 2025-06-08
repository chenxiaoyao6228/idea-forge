import { z } from "zod";
import { basePagerSchema } from "./_base";

// Base schemas
export const userInfoSchema = z.object({ 
  id: z.number().int().optional() 
});

export const userListRequestSchema = basePagerSchema.extend({
  query: z.string().optional(),
});

// Response schemas
export const userResponseSchema = z.object({
  id: z.number().int(),
  email: z.string(),
  displayName: z.string().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING"]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  imageUrl: z.string().url().nullable(),
});

export const userInfoResponseSchema = z.object({
  data: userResponseSchema,
});

export const userListResponseSchema = z.object({
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
  data: z.array(userResponseSchema),
});

// Types
export type UserInfoDto = z.infer<typeof userInfoSchema>;
export type UserListRequestDto = z.infer<typeof userListRequestSchema>;

export type UserResponse = z.infer<typeof userResponseSchema>;
export type UserInfoResponse = z.infer<typeof userInfoResponseSchema>;
export type UserListResponse = z.infer<typeof userListResponseSchema>;

// update user
export const UpdateUserRequestSchema = z.object({
    email: z.string().email().optional(),
    displayName: z.string().optional(),
    imageUrl: z.string().url().optional(),
  });
  export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
  