import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { UserOptionalDefaultsSchema } from "contracts";

// ===== Request DTOs =====

// Basic User Information DTO
export class RegisterDto extends createZodDto(
  z.object({
    email: z.string().email(),
    password: z.string().min(6).max(100),
  }),
) {}

// Email Verification DTO
export class EmailVerifyDto extends createZodDto(
  z.object({
    email: z.string().email(),
  }),
) {}

// Email Verification Code Validation DTO
export class EmailValidateDto extends createZodDto(
  z.object({
    email: z.string().email(),
    code: z.string().length(6),
  }),
) {}

// Forgot Password DTO
export class ForgotPasswordDto extends createZodDto(
  z.object({
    email: z.string().email(),
  }),
) {}

// Verification Code Validation DTO
export class CodeValidateDto extends createZodDto(
  z.object({
    email: z.string().email(),
    code: z.string().length(6),
    type: z.enum(["register", "reset-password", "change-email", "2fa"]),
  }),
) {}

// Reset Password DTO
export class ResetPasswordDto extends createZodDto(
  z.object({
    email: z.string().email(),
    password: z.string().min(6).max(100),
  }),
) {}

// Login DTO
export class LoginDto extends createZodDto(
  z.object({
    email: z.string().email(),
    password: z.string().min(6).max(100),
    remember: z.boolean().optional(),
  }),
) {}

// Create User DTO
export class CreateUserDto extends createZodDto(
  UserOptionalDefaultsSchema.extend({
    password: z.string().optional(),
    status: z.string(),
  }),
) {}

// Update User DTO
export class UpdateUserDto extends createZodDto(
  UserOptionalDefaultsSchema.pick({
    email: true,
    displayName: true,
    imageUrl: true,
  }).partial(),
) {}

// Create OAuth User DTO
export class CreateOAuthUserDto extends createZodDto(
  UserOptionalDefaultsSchema.extend({
    password: z.string().optional(),
    status: z.string(),
    providerId: z.string().optional(),
    providerName: z.enum(["google", "github"]).optional(),
  }),
) {}

// ===== Response Types =====
export interface UserResponseData {
  id: number;
  email?: string;
  displayName?: string;
  imageUrl?: string;
  collabToken?: string;
  currentWorkspaceId: string;
}

export interface LoginResponseData {
  user?: UserResponseData;
  accessToken?: string;
  refreshToken?: string;
}
