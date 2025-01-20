import { WandSparkles, Send, CircleStop } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAIPanelStore } from "./ai-panel-store";
import { useCallback, useEffect, useRef, useState } from "react";
import debounce from "lodash.debounce";
import scrollIntoView from "scroll-into-view-if-needed";

export function UserPrompt() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isComposing, setIsComposing] = useState(false);
  const editor = useAIPanelStore.use.editor();
  const isThinking = useAIPanelStore.use.isThinking();
  const isVisible = useAIPanelStore.use.isVisible();
  const result = useAIPanelStore.use.result();
  const isStreaming = useAIPanelStore.use.isStreaming();
  const prompt = useAIPanelStore.use.prompt();
  const setPrompt = useAIPanelStore.use.setPrompt();
  const setInputFocused = useAIPanelStore.use.setInputFocused();
  const submitUserPrompt = useAIPanelStore.use.submitUserPrompt();
  const setVisible = useAIPanelStore.use.setVisible();
  const stopStream = useAIPanelStore.use.stopStream();

  const placeholder = isThinking ? "AI is thinking..." : isStreaming ? "AI is writing..." : "Ask AI anything...";

  const isEmptyPrompt = !prompt.trim();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      submitUserPrompt();
    }
    if (e.key === "Escape") {
      setVisible(false);
      editor?.commands.focus();
    }
  };

  const handleStop = () => {
    stopStream();
    inputRef.current?.focus();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isStreaming && e.key === "Escape") {
        handleStop();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isStreaming, stopStream]);

  // Create debounced scroll function
  const debouncedScroll = useCallback(
    debounce((ref: HTMLDivElement) => {
      scrollIntoView(ref, {
        scrollMode: "if-needed",
        block: "nearest",
        behavior: "smooth",
      });
    }, 16),
    [],
  );

  // Use debounced function in effect
  useEffect(() => {
    if (isVisible && inputRef.current && (result || isStreaming)) {
      debouncedScroll(inputRef.current);
    }

    // Cleanup
    return () => {
      debouncedScroll.cancel();
    };
  }, [isVisible, result, isStreaming, debouncedScroll]);

  return (
    <div className="ai-panel-input flex items-center w-full rounded-md border bg-popover dark:bg-popover p-0.5 text-popover-foreground dark:text-popover-foreground">
      <WandSparkles className="mx-2.5 w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
      <Input
        ref={inputRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-0 border-none focus-visible:ring-0 focus-visible:ring-offset-0"
        onFocus={() => setInputFocused(true)}
        onBlur={() => setInputFocused(false)}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        onKeyDown={handleKeyDown}
        disabled={isThinking}
      />
      <Button size="icon" variant="ghost" onClick={() => (isStreaming ? handleStop() : submitUserPrompt())} disabled={isEmptyPrompt && !isStreaming}>
        {isThinking || isStreaming ? <CircleStop className="w-5 h-5" /> : <Send className="w-4 h-4" />}
      </Button>
    </div>
  );
}
