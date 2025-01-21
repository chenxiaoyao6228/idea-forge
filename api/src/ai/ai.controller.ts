import { Controller, Post, Body, Headers, Res, HttpStatus } from "@nestjs/common";
import { Response } from "express";
import { AIProviderService } from "./ai.service";
import { AIStreamRequest } from "shared";
import { GetUser } from "@/auth/decorators/get-user.decorator";
import { User } from "@prisma/client";
import { ErrorCodeEnum } from "@/_shared/constants/error-code.constant";
import { TokenUsageService } from "./token-usage.service";
import { ConfigService } from "@nestjs/config";

@Controller("api/ai")
export class AIController {
  constructor(
    private readonly aiProviderService: AIProviderService,
    private readonly tokenUsageService: TokenUsageService,
    private readonly configService: ConfigService,
  ) {}

  @Post("stream")
  async streamCompletion(@Body() request: AIStreamRequest, @GetUser() user: User, @Res() response: Response) {
    try {
      if (!request.messages?.length) {
        response.status(HttpStatus.BAD_REQUEST).send({ error: "Messages are required" });
        return;
      }
      // Set SSE headers
      response.setHeader("Content-Type", "text/event-stream");
      response.setHeader("Cache-Control", "no-cache");
      response.setHeader("Connection", "keep-alive");

      const isTokenUsageExceeded = await this.tokenUsageService.isTokenUsageExceeded(user.id);

      if (isTokenUsageExceeded) {
        response.write(
          `event: error\ndata: ${JSON.stringify({
            code: ErrorCodeEnum.AITokenLimitExceeded,
            message: `Token usage limit exceeded. Please contact ${this.configService.get("EMAIL_TO")} to get more`,
          })}\n\n`,
        );
        response.end();
        return;
      }

      const stream = await this.aiProviderService.streamCompletion(request, user.id);

      const subscription = stream.subscribe({
        next: (data) => {
          // Send data using standard SSE format
          response.write(`data: ${JSON.stringify(data)}\n\n`);
        },
        error: (error) => {
          console.error("Stream error:", error);
          // Send error event
          response.write(
            `event: error\ndata: ${JSON.stringify({
              code: error.code || "UNKNOWN_ERROR",
              message: error.message,
            })}\n\n`,
          );
          response.end();
        },
        complete: () => {
          // Send complete event before closing
          response.write(`event: complete\ndata: {}\n\n`);
          response.end();
        },
      });

      // Handle client disconnection
      response.on("close", () => {
        subscription.unsubscribe();
      });
    } catch (error: any) {
      console.error("Controller error:", error);
      response.write(
        `event: error\ndata: ${JSON.stringify({
          code: error.code || "UNKNOWN_ERROR",
          message: error.message,
        })}\n\n`,
      );
      response.end();
    }
  }
}
