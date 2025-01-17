import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useEventSource } from "@/hooks/use-event-source";

export default function TestAI() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const { isStreaming, start, stop } = useEventSource();

  async function handleSubmit() {
    if (!prompt.trim()) return;

    setResponse("");

    start({
      url: "/api/ai/stream",
      method: "POST",
      body: { prompt },
      headers: {
        // Authorization: "Bearer your-token-here",
      },
      maxRetries: 3,
      retryDelay: 1000,
      onData: (data) => {
        setResponse((prev) => prev + data.content);
      },
      onError: (error) => {
        console.error("Streaming error:", error);
      },
      onComplete: () => {
        console.log("Stream completed");
      },
    });
  }

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <h1 className="text-2xl font-bold">AI Stream Test</h1>

      <Card className="p-4 space-y-4">
        <Textarea placeholder="Enter your prompt here..." value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} className="w-full" />

        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={isStreaming || !prompt.trim()}>
            Send
          </Button>

          {isStreaming && (
            <Button onClick={stop} variant="destructive">
              Stop
            </Button>
          )}
        </div>
      </Card>

      {response && (
        <Card className="p-4">
          <pre className="whitespace-pre-wrap">{response}</pre>
        </Card>
      )}
    </div>
  );
}
