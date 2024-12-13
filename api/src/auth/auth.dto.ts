import { createZodDto } from "@/_shared/utils/zod/create-zod-dto";
import {
  RegisterSchema,
  EmailVerifySchema,
  EmailValidateSchema,
  ForgotPasswordSchema,
  CodeValidateSchema,
  ResetPasswordSchema,
  CreateUserSchema,
  UpdateUserSchema,
  CreateOAuthUserSchema,
} from "shared";

export class RegisterDto extends createZodDto(RegisterSchema) {}
export class EmailVerifyDto extends createZodDto(EmailVerifySchema) {}
export class EmailValidateDto extends createZodDto(EmailValidateSchema) {}
export class ForgotPasswordDto extends createZodDto(ForgotPasswordSchema) {}
export class CodeValidateDto extends createZodDto(CodeValidateSchema) {}
export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {}
export class CreateUserDto extends createZodDto(CreateUserSchema) {}
export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}
export class CreateOAuthUserDto extends createZodDto(CreateOAuthUserSchema) {}
