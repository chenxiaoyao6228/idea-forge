import { WandSparkles, Send, CircleStop, ArrowRightLeft, Check } from "lucide-react";
import { Input } from "@idea/ui/shadcn/ui/input";
import { Button } from "@idea/ui/shadcn/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@idea/ui/shadcn/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@idea/ui/shadcn/ui/command";
import { useAIPanelStore } from "./ai-panel-store";
import { useCallback, useEffect, useRef, useState } from "react";
import { debounce } from "lodash-es";
import scrollIntoView from "scroll-into-view-if-needed";
import { useTranslation } from "react-i18next";
import { cn } from "@idea/ui/shadcn/utils";

export function UserPrompt() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
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
  const availableModels = useAIPanelStore.use.availableModels();
  const selectedModel = useAIPanelStore.use.selectedModel();
  const setSelectedModel = useAIPanelStore.use.setSelectedModel();
  const loadAvailableModels = useAIPanelStore.use.loadAvailableModels();
  const isLoadingModels = useAIPanelStore.use.isLoadingModels();
  const hasLoadedModels = useAIPanelStore.use.hasLoadedModels();
  const { t } = useTranslation();

  // Load available models when component mounts or becomes visible
  useEffect(() => {
    if (isVisible && !hasLoadedModels && !isLoadingModels) {
      loadAvailableModels();
    }
  }, [isVisible, hasLoadedModels, isLoadingModels, loadAvailableModels]);

  // Check if no models are available after loading
  const noModelsAvailable = hasLoadedModels && availableModels.length === 0;

  // Get display name for model (shortened version)
  const getModelDisplayName = (model: string | null) => {
    if (!model) return t("Select model");
    // Shorten long model names for display
    const parts = model.split("/");
    return parts[parts.length - 1];
  };

  const placeholder = noModelsAvailable
    ? t("No AI models available. Please ask your admin to configure AI providers.")
    : isThinking
      ? t("AI is thinking...")
      : isStreaming
        ? t("AI is writing...")
        : t("Ask AI anything...");

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
        disabled={isThinking || noModelsAvailable}
      />
      {/* Model Selector */}
      {availableModels.length > 0 && (
        <Popover open={modelSelectorOpen} onOpenChange={setModelSelectorOpen} modal={false}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary hover:text-primary/80 gap-1" disabled={isThinking || isStreaming}>
              <span className="max-w-[120px] truncate">{getModelDisplayName(selectedModel)}</span>
              <ArrowRightLeft className="w-3 h-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="end" sideOffset={5}>
            <Command>
              <CommandList>
                <CommandGroup>
                  {availableModels.map((model) => (
                    <CommandItem
                      key={model}
                      value={model}
                      onPointerDown={(e) => e.preventDefault()}
                      onSelect={() => {
                        setSelectedModel(model);
                        setModelSelectorOpen(false);
                      }}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">{getModelDisplayName(model)}</span>
                      {selectedModel === model && <Check className="w-4 h-4 text-primary" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
      <Button
        size="icon"
        variant="ghost"
        onClick={() => (isStreaming ? handleStop() : submitUserPrompt())}
        disabled={(isEmptyPrompt && !isStreaming) || noModelsAvailable}
      >
        {isThinking || isStreaming ? <CircleStop className="w-5 h-5" /> : <Send className="w-4 h-4" />}
      </Button>
    </div>
  );
}
