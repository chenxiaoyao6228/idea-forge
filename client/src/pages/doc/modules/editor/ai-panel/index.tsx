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
import scrollIntoView from "scroll-into-view-if-needed";
import { useClickAway } from "react-use";

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
  const hasSelection = useAIPanelStore.use.hasSelection();
  const setHasSelection = useAIPanelStore.use.setHasSelection();
  const result = useAIPanelStore.use.result();
  const error = useAIPanelStore.use.error();
  const setVisible = useAIPanelStore.use.setVisible();
  const setInputFocused = useAIPanelStore.use.setInputFocused();
  const setPrompt = useAIPanelStore.use.setPrompt();
  const setEditor = useAIPanelStore.use.setEditor();
  const startStream = useAIPanelStore.use.startStream();
  const reset = useAIPanelStore.use.reset();

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

  function updatePanelPosition() {
    if (!editor || !panelRef.current) return;

    const selection = editor.state.selection;
    const { from, to } = selection;

    // Get editor container position info
    const editorContainer = document.getElementById("EDITOR-CONTAINER");
    if (!editorContainer) return;

    const editorRect = editorContainer.getBoundingClientRect();
    const view = editor.view;
    const start = view.coordsAtPos(from);
    const end = view.coordsAtPos(to);
    const bottom = Math.max(start.bottom, end.bottom);

    // Set panel position
    const panel = panelRef.current;
    const left = editorRect.left;
    const top = bottom + window.scrollY + 10;

    panel.style.position = "absolute";
    panel.style.left = `${left + 40}px`;
    panel.style.top = `${top}px`;
    panel.style.width = `${editorRect.width - 80}px`;
  }

  // Update position when panel becomes visible
  useEffect(() => {
    if (isVisible) {
      updatePanelPosition();

      // Focus input
      const input = panelRef.current?.querySelector("input");
      if (input) {
        input.focus();
      }

      // Let the panel render first
      setTimeout(() => {
        const panel = document.querySelector(".ai-panel");
        if (panel) {
          scrollIntoView(panel, {
            scrollMode: "if-needed",
            block: "nearest",
            behavior: "smooth",
          });
        }
      }, 0);
    }
  }, [isVisible]);

  // Hide panel when clicking away
  useClickAway(panelRef, () => {
    reset();
  });

  // Update panel position when editor changes
  useEffect(() => {
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition);
    };
  }, [editor, updatePanelPosition]);

  // Update hasSelection when selection changes
  useEffect(() => {
    window.addEventListener("selectionchange", () => {
      const selection = editor.state.selection;
      const { from, to } = selection;

      if (from === to) {
        setHasSelection(false);
      } else {
        setHasSelection(true);
      }
    });

    return () => {
      window.removeEventListener("selectionchange", () => {});
    };
  }, [editor, setHasSelection]);

  // Add effect to handle panel visibility and scrolling
  useEffect(() => {
    if (isVisible && panelRef.current && (result || isStreaming)) {
      scrollIntoView(panelRef.current, {
        scrollMode: "if-needed",
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [isVisible, result, isStreaming]);

  // Listen to keyboard space key
  useEffect(() => {
    function fn(event: KeyboardEvent) {
      if (!editor?.view) return;
      // Not space or tab key
      if (event.key !== " " && event.code !== "Tab") return;
      if (editor == null) return;
      const selection = editor.state.selection;
      if (!selection.empty) return; // selection is not empty
      const node = selection.$anchor.node();
      if (node?.isTextblock && node.textContent?.trim() === "") {
        // selected an empty line
        event.preventDefault(); // prevent default space input
        setHasSelection(false);
        setVisible(true);
      }
    }
    editor.view.dom.addEventListener("keydown", fn);

    return () => {
      editor.view.dom.removeEventListener("keydown", fn);
    };
  }, [editor, setVisible]);

  if (!portalContainer) return null;

  return createPortal(
    <div
      ref={panelRef}
      className="ai-panel  dark:bg-background rounded-md "
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
