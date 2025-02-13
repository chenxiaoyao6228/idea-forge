import { z } from "zod";

export const VERIFICATION_CODE_TYPES = ["register", "reset-password", "change-email", "2fa"] as const;

export const VerificationTypeSchema = z.enum(VERIFICATION_CODE_TYPES);
export type VerificationCodeType = z.infer<typeof VerificationTypeSchema>;

export const UserStatus = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  DELETED: "DELETED",
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const Provider = {
  google: "google",
  github: "github",
} as const;

export type Provider = (typeof Provider)[keyof typeof Provider];

//  ============== request ==============
export const EmailSchema = z
  .string({ required_error: "Email is required" })
  .email({ message: "Email is invalid" })
  .min(3, { message: "Email is too short" })
  .max(100, { message: "Email is too long" })
  // users can type the email in any case, but we store it in lowercase
  .transform((value) => value.toLowerCase().trim());

export const PasswordSchema = z
  .string({ required_error: "Password is required" })
  .min(6, { message: "Password is too short" })
  .max(100, { message: "Password is too long" })
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    // TODO: i18n
    message: "Password must contain uppercase, lowercase letters and numbers",
  });

export const DisplayNameSchema = z
  .string()
  .min(1)
  .max(20)
  .transform((val) => val.trim().toLowerCase().trim());

// ==============================================================

// register
export const RegisterRequestSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

// ==============================================================
// login
export const LoginRequestSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  remember: z.boolean().optional(),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

// ==============================================================

export const EmailVerifyRequestSchema = z.object({
  email: EmailSchema,
});
export type EmailVerifyRequest = z.infer<typeof EmailVerifyRequestSchema>;

// ==============================================================

export const EmailValidateRequestSchema = z.object({
  email: EmailSchema,
  code: z.string().length(6),
});
export type EmailValidateRequest = z.infer<typeof EmailValidateRequestSchema>;

// ==============================================================

export const ForgotPasswordRequestSchema = z.object({
  email: EmailSchema,
});
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

// ==============================================================

export const CodeValidateRequestSchema = z.object({
  email: EmailSchema,
  code: z.string().length(6),
  type: VerificationTypeSchema,
});

export type CodeValidateRequest = z.infer<typeof CodeValidateRequestSchema>;

// ==============================================================

export const ResetPasswordRequestSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;

// ==============================================================

export const CreateUserRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().optional(),
  status: z.nativeEnum(UserStatus),
});
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

// ==============================================================

export const CreateOAuthUserRequestSchema = CreateUserRequestSchema.extend({
  displayName: z.string().optional(),
  imageUrl: z.string().url().optional(),
  providerId: z.string().optional(),
  providerName: z.nativeEnum(Provider).optional(),
});
export type CreateOAuthUserRequest = z.infer<typeof CreateOAuthUserRequestSchema>;

// ==============================================================

export const UpdateUserRequestSchema = z.object({
  email: EmailSchema.optional(),
  displayName: z.string().optional(),
  imageUrl: z.string().url().optional(),
});
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;

//  ============== response ==============

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
  id: number;
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
