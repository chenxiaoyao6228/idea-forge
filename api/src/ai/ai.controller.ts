import { Controller, Post, Body, Headers, Res, HttpStatus } from "@nestjs/common";
import { Response } from "express";
import { AIProviderService } from "./ai.service";

const EventStreamContentType = "text/event-stream";

@Controller("api/ai")
export class AIController {
  constructor(private readonly aiProviderService: AIProviderService) {}

  @Post("stream")
  async streamCompletion(@Body() body: { prompt: string }, @Headers("authorization") auth: string, @Res() response: Response) {
    if (!body.prompt) {
      response.status(HttpStatus.BAD_REQUEST).send({ error: "Prompt is required" });
      return;
    }

    // Set SSE headers
    response.setHeader("Content-Type", EventStreamContentType);
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Connection", "keep-alive");

    const stream = await this.aiProviderService.streamCompletionMock(body.prompt);

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
