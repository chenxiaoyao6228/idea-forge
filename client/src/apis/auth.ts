import request from "@/lib/request";
import { CodeValidateRequest, ForgotPasswordRequest, LoginRequest, RegisterRequest, ResetPasswordRequest, LoginResponseData } from "shared";

export const authApi = {
  register: async (data: RegisterRequest) => request.post<RegisterRequest, void>("/api/auth/register", data),
  validateCode: async (data: CodeValidateRequest) => request.post<CodeValidateRequest, void>("/api/auth/code/validate", data),
  login: async (data: LoginRequest) => request.post<LoginRequest, LoginResponseData>("/api/auth/login", data),
  logout: async () => request.post<void>("/api/auth/logout"),
  forgotPassword: async (data: ForgotPasswordRequest) => request.post<ForgotPasswordRequest, void>("/api/auth/forgot-password", data),
  resetPassword: async (data: ResetPasswordRequest) => request.post<ResetPasswordRequest, void>("/api/auth/reset-password", data),
};
