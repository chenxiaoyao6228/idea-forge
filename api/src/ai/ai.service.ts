import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { AIProviderConfig } from "./ai.type";
import { Subject, Observable } from "rxjs";
import { AIStreamResponse, AIStreamRequest, ChatMessage } from "shared";
import { faker } from "@faker-js/faker";
import { TokenUsageService } from "./token-usage.service";
import { ApiException } from "@/_shared/model/api.exception";

@Injectable()
export class AIProviderService implements OnModuleInit {
  private readonly logger = new Logger(AIProviderService.name);
  private providers: Map<string, { config: AIProviderConfig; client: OpenAI }> = new Map();
  private activeProviders: AIProviderConfig[] = [];

  constructor(
    private configService: ConfigService,
    private tokenUsageService: TokenUsageService,
  ) {}

  onModuleInit() {
    this.initializeProviders();
  }

  private initializeProviders() {
    const configs = this.configService.get<{ providers: AIProviderConfig[] }>("aiProviders");

    if (!configs) {
      this.logger.error("AI providers configuration not found");
      return;
    }

    configs.providers.forEach((config) => {
      try {
        const client = new OpenAI({
          apiKey: config.apiKey,
          baseURL: config.baseURL || "https://api.openai.com/v1",
        });

        this.providers.set(config.id, { config, client });
        if (config.isActive) {
          this.activeProviders.push(config);
        }
      } catch (error) {
        this.logger.error(`Failed to initialize provider ${config.id}:`, error);
      }
    });

    console.log("=========this.activeProviders===========", this.activeProviders);

    this.activeProviders.sort((a, b) => a.priority - b.priority);
  }

  async streamCompletion(request: AIStreamRequest, userId: number): Promise<Observable<AIStreamResponse>> {
    const subject = new Subject<AIStreamResponse>();

    try {
      const tryProvider = async (providerIndex: number) => {
        if (providerIndex >= this.activeProviders.length) {
          subject.error(new Error("All providers failed"));
          subject.complete();
          return;
        }

        const provider = this.activeProviders[providerIndex];
        const { client } = this.providers.get(provider.id) as { config: AIProviderConfig; client: OpenAI };

        try {
          const stream = await client.chat.completions.create({
            model: provider.model,
            messages: request.messages,
            stream: true,
            temperature: request.options?.temperature ?? 0.7,
            max_tokens: request.options?.max_tokens ?? 1000,
          });

          for await (const chunk of stream) {
            // console.log("=========chunk===========", chunk);
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              subject.next({
                id: provider.id,
                content,
                provider: provider.name,
              });
            }
            const usage = chunk.usage;
            if (usage) {
              await this.tokenUsageService.updateTokenUsage(userId, usage.total_tokens);
            }
          }

          subject.complete();
        } catch (error: any) {
          this.logger.error(`Provider ${provider.id} failed:`, error);
          await tryProvider(providerIndex + 1);
        }
      };

      tryProvider(0);
      return subject.asObservable();
    } catch (error) {
      if (error instanceof ApiException) {
        subject.error(error);
        return subject.asObservable();
      }
      throw error;
    }
  }

  // FIXME: remove this after the AI feature is stable
  async streamCompletionMock(request: AIStreamRequest): Promise<Observable<AIStreamResponse>> {
    if (process.env.NODE_ENV === "production") {
      return this.streamCompletion(request, 0);
    }

    const subject = new Subject<AIStreamResponse>();

    function generateMockResponse(messages: ChatMessage[]): string {
      const systemMessage = messages.find((msg) => msg.role === "system")?.content || "";
      const userMessage = messages.find((msg) => msg.role === "user")?.content || "";

      // Generate different types of markdown content based on the context
      if (systemMessage.includes("translator")) {
        return [`> Original Text\n`, `${faker.lorem.paragraph()}\n\n`, `### Translated Version\n`, faker.lorem.paragraphs(2, "\n\n")].join("\n");
      }

      if (systemMessage.includes("summarizer")) {
        return [
          `## Summary\n`,
          faker.lorem.paragraph(3),
          `\n### Key Points\n`,
          `- ${faker.lorem.sentence()}`,
          `- ${faker.lorem.sentence()}`,
          `- ${faker.lorem.sentence()}\n`,
        ].join("\n");
      }

      if (systemMessage.includes("outline")) {
        return [
          `# Document Outline\n`,
          `## 1. ${faker.lorem.sentence()}`,
          `   - ${faker.lorem.sentence()}`,
          `   - ${faker.lorem.sentence()}`,
          `## 2. ${faker.lorem.sentence()}`,
          `   ### 2.1. ${faker.lorem.sentence()}`,
          `   - ${faker.lorem.sentence()}`,
          `## 3. ${faker.lorem.sentence()}`,
        ].join("\n");
      }

      if (systemMessage.includes("idea generator")) {
        return [
          `# Generated Ideas\n`,
          `## Main Concepts\n`,
          `1. **${faker.lorem.sentence()}**`,
          `   - ${faker.lorem.sentence()}`,
          `   - ${faker.lorem.sentence()}\n`,
          `2. **${faker.lorem.sentence()}**`,
          `   - ${faker.lorem.sentence()}`,
          `   - \`${faker.lorem.words(3)}\`\n`,
          `## Additional Suggestions\n`,
          `> ${faker.lorem.paragraph()}`,
        ].join("\n");
      }

      // Default response with rich markdown formatting
      return [
        `# ${faker.lorem.sentence()}\n`,
        `## Overview\n`,
        faker.lorem.paragraph(),
        `\n### Key Features\n`,
        `- **${faker.lorem.words(3)}**: ${faker.lorem.sentence()}`,
        `- **${faker.lorem.words(2)}**: ${faker.lorem.sentence()}`,
        `- **${faker.lorem.words(4)}**: ${faker.lorem.sentence()}\n`,
        `### Code Example\n`,
        "```typescript",
        `function ${faker.lorem.word()}() {`,
        `  // ${faker.lorem.words(4)}`,
        `  return ${faker.lorem.words(2)};`,
        "```\n",
        `> ${faker.lorem.paragraph()}`,
      ].join("\n");
    }

    // Generate mock response
    const responseText = generateMockResponse(request.messages);

    // Calculate streaming parameters
    const numberOfChunks = 20;
    const chunkSize = Math.ceil(responseText.length / numberOfChunks);
    const delayBetweenChunks = 1000 / numberOfChunks;

    // Simulate streaming with chunks
    (async () => {
      const mockProvider = this.activeProviders[0] || {
        id: "mock-provider",
        name: "Mock Provider",
      };

      for (let i = 0; i < responseText.length; i += chunkSize) {
        const chunk = responseText.slice(i, i + chunkSize);
        await new Promise((resolve) => setTimeout(resolve, delayBetweenChunks));

        subject.next({
          id: mockProvider.id,
          content: chunk,
          provider: mockProvider.name,
        });
      }

      subject.complete();
    })();

    return subject.asObservable();
  }
}
