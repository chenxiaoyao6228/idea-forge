import { useCallback, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  const panelRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
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

  // Create portal container on mount
  useEffect(() => {
    const container = document.createElement("div");
    container.className = "ai-panel-portal";
    document.body.appendChild(container);
    setPortalContainer(container);

    return () => {
      document.body.removeChild(container);
    };
  }, []);

  // Listen for selection changes and update panel position
  useEffect(() => {
    function updatePanelPosition() {
      if (!editor || !panelRef.current) return;

      const selection = editor.state.selection;
      const { from, to } = selection;

      if (from === to) {
        setVisible(false);
        return;
      }

      // Get editor container position info
      const editorContainer = document.getElementById("EDITOR-CONTAINER");
      if (!editorContainer) return;

      const editorRect = editorContainer.getBoundingClientRect();

      // Get DOM position of selected text
      const view = editor.view;
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);

      // Calculate center position of selected area (relative to viewport)
      const bottom = Math.max(start.bottom, end.bottom);

      // Set panel position, considering scroll position
      const panel = panelRef.current;
      const panelRect = panel.getBoundingClientRect();

      // Ensure panel doesn't exceed editor boundaries
      const viewportHeight = window.innerHeight;

      // Constrain panel within editor container
      const left = editorRect.left;
      let top = bottom + window.scrollY + 10; // 10px below selected text

      // Vertical boundary check
      if (top + panelRect.height > viewportHeight + window.scrollY) {
        // If not enough space below, show panel above selected text
        top = start.top + window.scrollY - panelRect.height - 10;
      }

      panel.style.position = "absolute";
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
      panel.style.width = `${editorRect.width}px`;
      panel.style.transform = "none"; // Remove the transform since we're using exact positioning

      setVisible(true);
    }

    editor.on("selectionUpdate", updatePanelPosition);

    // Add scroll event listener
    const handleScroll = () => {
      if (isVisible) {
        updatePanelPosition();
      }
    };

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", updatePanelPosition);

    return () => {
      editor.off("selectionUpdate", updatePanelPosition);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", updatePanelPosition);
    };
  }, [editor, setVisible, isVisible]);

  if (!portalContainer) return null;

  return createPortal(
    <div
      ref={panelRef}
      className="ai-panel bg-background dark:bg-background rounded-md shadow-lg"
      style={{
        display: isVisible ? "block" : "none",
        zIndex: 50,
        position: "absolute",
        visibility: isVisible ? "visible" : "hidden",
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.2s ease-in-out",
        // Remove maxWidth and width constraints since we're using editor width
      }}
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
    </div>,
    portalContainer,
  );
}
