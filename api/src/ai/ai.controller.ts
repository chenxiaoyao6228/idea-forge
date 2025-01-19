import { Controller, Post, Body, Headers, Res, HttpStatus } from "@nestjs/common";
import { Response } from "express";
import { AIProviderService } from "./ai.service";
import { AIStreamRequest } from "shared";

@Controller("api/ai")
export class AIController {
  constructor(private readonly aiProviderService: AIProviderService) {}

  @Post("stream")
  async streamCompletion(@Body() request: AIStreamRequest, @Headers("authorization") auth: string, @Res() response: Response) {
    if (!request.messages?.length) {
      response.status(HttpStatus.BAD_REQUEST).send({ error: "Messages are required" });
      return;
    }
    // Set SSE headers
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Connection", "keep-alive");

    const stream = await this.aiProviderService.streamCompletion(request);

    const subscription = stream.subscribe({
      next: (data) => {
        // Send data using standard SSE format
        response.write(`data: ${JSON.stringify(data)}\n\n`);
      },
      error: (error) => {
        console.error("Stream error:", error);
        // Send error event
        response.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
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
  }
}
