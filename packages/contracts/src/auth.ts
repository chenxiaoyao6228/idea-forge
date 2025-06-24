import { UserStatus } from "@prisma/client";
import { z } from "zod";

export const VERIFICATION_CODE_TYPES = ["register", "reset-password", "change-email", "2fa"] as const;

export const VerificationTypeSchema = z.enum(VERIFICATION_CODE_TYPES);
export type VerificationCodeType = z.infer<typeof VerificationTypeSchema>;

export const Provider = {
  google: "google",
  github: "github",
} as const;

export type Provider = (typeof Provider)[keyof typeof Provider];

// Common schemas
export const EmailSchema = z.string().email();
export const PwdSchema = z.string().min(6).max(30);
export const DisplayNameSchema = z.string().min(1).max(50);

// Common response interfaces
export interface AuthResponse {
  type: AuthResponseType;
  data: AuthResponseData;
}

export type AuthResponseType =
  | "NEW_USER" // New user, account and connection automatically created
  | "EXISTING_USER" // Existing connected user direct login
  | "EMAIL_CONFLICT" // Logged in user binding new account
  | "ERROR"; // Other errors

export interface UserResponseData {
  id: string;
  email?: string;
  displayName?: string;
  imageUrl?: string;
  collabToken?: string;
}

export interface LoginResponseData {
  user?: UserResponseData;
  accessToken?: string; // oauth return accessToken
  refreshToken?: string;
}

export interface AuthResponseData extends LoginResponseData {
  provider?: string;
  error?: {
    code: string;
    message: string;
  };
}

// ==============================================================
// register
export const RegisterRequestSchema = z.object({
  email: EmailSchema,
  password: PwdSchema,
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

// ==============================================================
// login
export const LoginRequestSchema = z.object({
  email: EmailSchema,
  password: PwdSchema,
  remember: z.boolean().optional(),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

// ==============================================================
// email verify
export const EmailVerifyRequestSchema = z.object({
  email: EmailSchema,
});
export type EmailVerifyRequest = z.infer<typeof EmailVerifyRequestSchema>;

// ==============================================================
// email validate
export const EmailValidateRequestSchema = z.object({
  email: EmailSchema,
  code: z.string().length(6),
});
export type EmailValidateRequest = z.infer<typeof EmailValidateRequestSchema>;

// ==============================================================
// forgot password
export const ForgotPasswordRequestSchema = z.object({
  email: EmailSchema,
});
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

// ==============================================================
// code validate
export const CodeValidateRequestSchema = z.object({
  email: EmailSchema,
  code: z.string().length(6),
  type: VerificationTypeSchema,
});
export type CodeValidateRequest = z.infer<typeof CodeValidateRequestSchema>;

// ==============================================================
// reset password
export const ResetPasswordRequestSchema = z.object({
  email: EmailSchema,
  password: PwdSchema,
});
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;

// ==============================================================
// create user
export const CreateUserRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().optional(),
  status: z.nativeEnum(UserStatus),
});
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

// ==============================================================
// create OAuth user
export const CreateOAuthUserRequestSchema = CreateUserRequestSchema.extend({
  displayName: z.string().optional(),
  imageUrl: z.string().url().optional(),
  providerId: z.string().optional(),
  providerName: z.nativeEnum(Provider).optional(),
});
export type CreateOAuthUserRequest = z.infer<typeof CreateOAuthUserRequestSchema>;
