import request from "@/lib/request";
import { TokenUsageRequest, TokenUsageResponse, UpdateUserTokenLimitRequest } from "contracts";
export const aiApi = {
  getUserTokenUsage: async (data: TokenUsageRequest) => request.get<TokenUsageRequest, TokenUsageResponse>("/api/ai/admin/token-usage", { params: data }),
  updateUserTokenLimit: async (data: UpdateUserTokenLimitRequest) => request.post<UpdateUserTokenLimitRequest, void>("/api/ai/admin/update-token", data),
};
