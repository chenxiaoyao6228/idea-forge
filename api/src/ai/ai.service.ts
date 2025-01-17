import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { AIProviderConfig, StreamResponse } from "./ai.type";
import { Subject, Observable } from "rxjs";

@Injectable()
export class AIProviderService implements OnModuleInit {
  private readonly logger = new Logger(AIProviderService.name);
  private providers: Map<string, { config: AIProviderConfig; client: OpenAI }> = new Map();
  private activeProviders: AIProviderConfig[] = [];

  constructor(private configService: ConfigService) {}

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

  async streamCompletion(prompt: string): Promise<Observable<StreamResponse>> {
    const subject = new Subject<StreamResponse>();

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
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: prompt },
          ],
          stream: true,
          temperature: 0.7,
          max_tokens: 2000,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          console.log("content", content);
          if (content) {
            subject.next({
              id: provider.id,
              content,
              provider: provider.name,
            });
          }
        }

        subject.complete();
      } catch (error: any) {
        this.logger.error(`Provider ${provider.id} failed:`, error);
        this.logger.error(`Error details:`, {
          message: error.message,
          code: error.code,
          type: error.type,
        });
        await tryProvider(providerIndex + 1);
      }
    };

    tryProvider(0);
    return subject.asObservable();
  }
}
