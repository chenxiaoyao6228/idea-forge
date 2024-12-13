import { z } from "zod";
import { Provider } from "./_shared";
import { UserStatus } from "./_shared";
import { VERIFICATION_CODE_TYPES } from "./_shared";

// request
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

// register
export const RegisterSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});

export type RegisterData = z.infer<typeof RegisterSchema>;

// login
export const LoginSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  remember: z.boolean().optional(),
});

export type LoginData = z.infer<typeof LoginSchema>;


export const EmailVerifySchema = z.object({
  email: EmailSchema,
});

export const EmailValidateSchema = z.object({
  email: EmailSchema,
  code: z.string().length(6),
});

export const ForgotPasswordSchema = z.object({
  email: EmailSchema,
});

export const CodeValidateSchema = z.object({
  email: EmailSchema,
  code: z.string().length(6),
  type: z.enum(VERIFICATION_CODE_TYPES),
});

export const ResetPasswordSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});

export const CreateUserSchema = z.object({
  email: EmailSchema,
  password: z.string().optional(),
  status: z.nativeEnum(UserStatus),
});

export const CreateOAuthUserSchema = CreateUserSchema.extend({
  displayName: z.string().optional(),
  imageUrl: z.string().url().optional(),
  providerId: z.string().optional(),
  providerName: z.nativeEnum(Provider).optional(),
});

export const UpdateUserSchema = z.object({
  email: EmailSchema.optional(),
  displayName: z.string().optional(),
  imageUrl: z.string().url().optional(),
});


// ============================== response ==============================
export const LoginResponseSchema = z.object({
  token: z.string(),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;
