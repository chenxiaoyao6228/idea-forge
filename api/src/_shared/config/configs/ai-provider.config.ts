import { registerAs } from "@nestjs/config";

export const aiProviderConfig = registerAs("aiProviders", () => ({
  providers: [
    {
      id: "deepseek-1",
      name: "DeepSeek Primary",
      apiKey: process.env.DEEPSEEK_API_KEY_1,
      baseURL: "https://api.deepseek.com",
      model: "deepseek-chat", // DeepSeek-V3 model
      isActive: true,
      priority: 1,
    },

    // {
    //   id: "openai-1",
    //   name: "OpenAI Primary",
    //   apiKey: process.env.OPENAI_API_KEY_1,
    //   model: "gpt-4",
    //   isActive: true,
    //   priority: 1,
    // },
  ],
}));
