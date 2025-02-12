import { createZodDto } from "nestjs-zod";

import {
  RegisterRequestSchema,
  EmailVerifyRequestSchema,
  EmailValidateRequestSchema,
  ForgotPasswordRequestSchema,
  CodeValidateRequestSchema,
  ResetPasswordRequestSchema,
  CreateUserRequestSchema,
  UpdateUserRequestSchema,
  CreateOAuthUserRequestSchema,
} from "shared";

export class RegisterDto extends createZodDto(RegisterRequestSchema) {}
export class EmailVerifyDto extends createZodDto(EmailVerifyRequestSchema) {}
export class EmailValidateDto extends createZodDto(EmailValidateRequestSchema) {}
export class ForgotPasswordDto extends createZodDto(ForgotPasswordRequestSchema) {}
export class CodeValidateDto extends createZodDto(CodeValidateRequestSchema) {}
export class ResetPasswordDto extends createZodDto(ResetPasswordRequestSchema) {}
export class CreateUserDto extends createZodDto(CreateUserRequestSchema) {}
export class UpdateUserDto extends createZodDto(UpdateUserRequestSchema) {}
export class CreateOAuthUserDto extends createZodDto(CreateOAuthUserRequestSchema) {}
