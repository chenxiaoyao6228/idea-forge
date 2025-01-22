import request from "@/lib/request";
import { TokenUsageData, UpdateUserTokenLimitData } from "shared";
export const aiApi = {
  getUserTokenUsage: async (email: string) => {
    return request.get<{ email: string }, TokenUsageData>("/api/ai/admin/token-usage", {
      params: { email },
    });
  },
  updateUserTokenLimit: async (data: UpdateUserTokenLimitData) => {
    return request.post<UpdateUserTokenLimitData, void>("/api/ai/admin/update-token", data);
  },
};
