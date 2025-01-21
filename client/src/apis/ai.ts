import request from "@/lib/request";
import { TokenUsageData, UpdateUserTokenLimitRequestData } from "shared";
export const aiApi = {
  getUserTokenUsage: async (email: string) => {
    return request.get<{ email: string }, TokenUsageData>("/api/ai/admin/token-usage", {
      params: { email },
    });
  },
  updateUserTokenLimit: async (data: UpdateUserTokenLimitRequestData) => {
    return request.post<UpdateUserTokenLimitRequestData, void>("/api/ai/admin/update-token", data);
  },
};
