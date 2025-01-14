import request from "@/lib/request";
import { LoginData, LoginResponseData } from "shared";

export const authApi = {
  login: async (data: LoginData) => {
    return request.post<LoginData, LoginResponseData>("/api/auth/login", data);
  },
  logout: async () => {
    return request.post<void>("/api/auth/logout");
  },
};
