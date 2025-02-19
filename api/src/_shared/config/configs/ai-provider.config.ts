import { registerAs } from "@nestjs/config";

export const aiProviderConfig = registerAs("aiProviders", () => ({
  providers: [
    // https://docs.siliconflow.cn/
    {
      id: "silicon-flow-1",
      name: "Silicon Flow Primary",
      apiKey: process.env.SILICON_FLOW_API_KEY_1,
      baseURL: "https://api.siliconflow.cn/v1",
      model: "deepseek-ai/DeepSeek-V3",
      isActive: true,
      priority: 1,
    },
    //  https://platform.deepseek.com/
    {
      id: "deepseek-1",
      name: "DeepSeek Primary",
      apiKey: process.env.DEEPSEEK_API_KEY_1,
      baseURL: "https://api.deepseek.com",
      model: "deepseek-chat", // DeepSeek-V3 model
      isActive: true,
      priority: 2,
    },
  ],
}));
