import { useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Editor } from "@tiptap/core";
import { Send, WandSparkles, Loader2 } from "lucide-react";
import { AIPresetActions } from "./preset-actions";
import AIResult from "./result";
import ConfirmButtons from "./confirm-buttons";
import { useAIPanelStore } from "./ai-panel-store";

interface AIPanelProps {
  editor: Editor;
}

export default function AIPanel({ editor }: AIPanelProps) {
  const isVisible = useAIPanelStore.use.isVisible();
  const isInputFocused = useAIPanelStore.use.isInputFocused();
  const isThinking = useAIPanelStore.use.isThinking();
  const isStreaming = useAIPanelStore.use.isStreaming();
  const prompt = useAIPanelStore.use.prompt();
  const result = useAIPanelStore.use.result();
  const error = useAIPanelStore.use.error();
  const setVisible = useAIPanelStore.use.setVisible();
  const setInputFocused = useAIPanelStore.use.setInputFocused();
  const setPrompt = useAIPanelStore.use.setPrompt();
  const setEditor = useAIPanelStore.use.setEditor();
  const startStream = useAIPanelStore.use.startStream();

  // Set editor on mount
  useEffect(() => {
    setEditor(editor);
  }, [editor, setEditor]);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim()) return;
    await startStream(prompt);
  }, [prompt, startStream]);

  const placeholder = isThinking ? "AI is thinking..." : isStreaming ? "AI is writing..." : "Ask AI anything...";
  const isEmptyPrompt = !prompt.trim();

  return (
    <div
      className="ai-panel absolute bottom-[0px] left-0 right-0 mx-10 mt-2 bg-background dark:bg-background rounded-md"
      style={{ display: isVisible ? "block" : "none" }}
    >
      {/* ai-result */}
      {(result || error) && <AIResult result={result} error={error} />}

      {/* ai-input */}
      <div className="ai-panel-input flex items-center w-full rounded-md border bg-popover dark:bg-popover p-0.5 text-popover-foreground dark:text-popover-foreground">
        <WandSparkles className="mx-2.5 w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-0 border-none focus-visible:ring-0 focus-visible:ring-offset-0"
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              handleSubmit();
            }
          }}
          disabled={isThinking}
        />
        <Button size="icon" variant="ghost" onClick={handleSubmit} disabled={isEmptyPrompt || isThinking || isStreaming}>
          {isThinking || isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      {/* ai-preset-actions */}
      {isInputFocused && !isThinking && isEmptyPrompt && !result && <AIPresetActions />}

      {/* confirm-buttons */}
      {!isStreaming && result && <ConfirmButtons />}
    </div>
  );
}
