import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import {
  CodeValidateRequestSchema,
  CreateOAuthUserRequestSchema,
  CreateUserRequestSchema,
  EmailValidateRequestSchema,
  EmailVerifyRequestSchema,
  ForgotPasswordRequestSchema,
  LoginRequestSchema,
  RegisterRequestSchema,
  ResetPasswordRequestSchema,
  SetPasswordRequestSchema,
  UpdateUserRequestSchema,
} from "@idea/contracts";

// ===== Request DTOs =====

// Basic User Information DTO
export class RegisterDto extends createZodDto(RegisterRequestSchema) {}

// Email Verification DTO
export class EmailVerifyDto extends createZodDto(EmailVerifyRequestSchema) {}

// Email Verification Code Validation DTO
export class EmailValidateDto extends createZodDto(EmailValidateRequestSchema) {}

// Forgot Password DTO
export class ForgotPasswordDto extends createZodDto(ForgotPasswordRequestSchema) {}

// Verification Code Validation DTO
export class CodeValidateDto extends createZodDto(CodeValidateRequestSchema) {}

// Reset Password DTO
export class ResetPasswordDto extends createZodDto(ResetPasswordRequestSchema) {}

// Set Password DTO
export class SetPasswordDto extends createZodDto(SetPasswordRequestSchema) {}

// Login DTO
export class LoginDto extends createZodDto(LoginRequestSchema) {}

// Create User DTO
export class CreateUserDto extends createZodDto(CreateUserRequestSchema) {}

// Update User DTO
export class UpdateUserDto extends createZodDto(UpdateUserRequestSchema) {}

// Create OAuth User DTO
export class CreateOAuthUserDto extends createZodDto(CreateOAuthUserRequestSchema) {}
