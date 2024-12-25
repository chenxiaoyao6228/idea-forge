import request from "@/lib/request";

export const authApi = {
  logout: async () => {
    return request.post<void>("/api/auth/logout");
  },
};
