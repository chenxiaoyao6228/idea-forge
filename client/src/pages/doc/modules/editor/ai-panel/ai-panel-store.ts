import { create } from "zustand";
import { Editor } from "@tiptap/core";
import { EventSourceService } from "@/lib/event-source";
import createSelectors from "@/stores/utils/createSelector";
import { PresetType, getStreamOptions, buildUserPromptMessage, buildPresetPromptMessage, markdownToHtml } from "./util";
import { AIStreamRequest } from "shared";

interface AIPanelState {
  // Services
  eventSourceService: EventSourceService;

  // View States
  hasSelection: boolean;
  isVisible: boolean;
  isInputFocused: boolean;

  // Input States
  prompt: string;

  // Processing States
  isThinking: boolean;
  isStreaming: boolean;

  // Result States
  result: string;
  resultHtml: string;
  error: {
    message: string;
    action: {
      label: string;
      handler: () => void;
    };
  } | null;

  // Editor Reference
  editor: Editor | null;
  currentRequest: AIStreamRequest | null;

  // Basic Actions
  setVisible: (visible: boolean) => void;
  setHasSelection: (hasSelection: boolean) => void;
  setInputFocused: (focused: boolean) => void;
  setPrompt: (prompt: string) => void;
  setEditor: (editor: Editor) => void;

  // Complex Actions
  handleError: (message: string) => void;
  reset: () => void;
  replaceResult: () => void;
  discardResult: () => void;
  startStream: (request: AIStreamRequest) => Promise<void>;
  stopStream: () => void;
  retryStream: () => void;
  insertBelow: () => void;
  submitUserPrompt: () => Promise<void>;
  submitPresetPrompt: (preset: PresetType, options?: any) => Promise<void>;
}

export const store = create<AIPanelState>((set, get) => ({
  // Initialize services
  eventSourceService: new EventSourceService(),

  // Initial States
  isVisible: false,
  hasSelection: false,
  isInputFocused: false,
  prompt: "",
  isThinking: false,
  isStreaming: false,
  result: "",
  resultHtml: "",
  error: null,
  editor: null,
  currentRequest: null,

  // Basic State Actions
  setVisible: (visible) => set({ isVisible: visible }),
  setHasSelection: (hasSelection) => set({ hasSelection }),
  setInputFocused: (focused) => set({ isInputFocused: focused }),
  setPrompt: (prompt) => set({ prompt }),
  setEditor: (editor) => set({ editor }),

  // Error Handler
  handleError: (message) => {
    set({
      isThinking: false,
      error: {
        message,
        action: {
          label: "Retry",
          handler: () => get().retryStream(),
        },
      },
    });
  },

  // Reset all states
  reset: () => {
    set({
      hasSelection: false,
      isVisible: false,
      isInputFocused: false,
      isThinking: false,
      isStreaming: false,
      result: "",
      resultHtml: "",
      error: null,
      prompt: "",
    });
  },

  // Handle result confirmation - overwrites selection if exists
  replaceResult: () => {
    const { editor, resultHtml } = get();
    if (!editor || !resultHtml) return;

    editor.chain().focus().deleteSelection().insertContent(resultHtml).run();

    get().reset();
  },

  // Insert content below - always inserts at current position
  insertBelow: () => {
    const { editor, resultHtml } = get();
    if (!editor || !resultHtml) return;

    const { selection } = editor.state;
    const $pos = editor.state.doc.resolve(selection.to);

    // Check if current paragraph is empty and not the first node
    const isEmptyParagraph = $pos.parent.content.size === 0;
    const isNotFirstNode = $pos.depth > 0 && $pos.index($pos.depth - 1) > 0;

    if (isEmptyParagraph && isNotFirstNode) {
      // If empty paragraph and not first node, insert before current paragraph
      editor.chain().focus().setTextSelection($pos.before()).insertContent(resultHtml).run();
    } else {
      // Normal case: insert after current paragraph
      const endOfParagraph = $pos.end();
      editor
        .chain()
        .focus()
        .setTextSelection(endOfParagraph)
        .insertContent("\n" + resultHtml)
        .focus()
        .run();
    }

    get().reset();
  },

  // Handle result cancellation
  discardResult: () => {
    get().reset();
    get().editor?.commands.focus();
  },

  // Start streaming process
  startStream: async (request: AIStreamRequest) => {
    set({
      currentRequest: request,
      isThinking: true,
      isStreaming: false,
      error: null,
      result: "",
      resultHtml: "",
    });

    await get().eventSourceService.start(
      {
        url: "/api/ai/stream",
        body: request,
      },
      {
        onMessage: (data) => {
          if (!get().isStreaming) {
            set({ isStreaming: true, isThinking: false });
          }
          const concatenatedResult = get().result + data.content;
          set((state) => ({
            result: concatenatedResult,
            resultHtml: markdownToHtml(concatenatedResult),
          }));
        },
        onComplete: () => {
          console.log("handleStreamData", get().result);
          set({
            isStreaming: false,
            isThinking: false,
          });
        },
        onError: (error) => {
          set({
            error: {
              message: error.message,
              action: {
                label: "Retry",
                handler: () => get().retryStream(),
              },
            },
            isStreaming: false,
            isThinking: false,
          });
        },
      },
    );
  },

  // Submit user prompt
  submitUserPrompt: async () => {
    const { prompt, editor, startStream } = get();
    if (!prompt.trim() || !editor) return;

    set({ prompt: "" });

    const request: AIStreamRequest = {
      messages: buildUserPromptMessage(editor, prompt),
      options: getStreamOptions(),
    };

    await startStream(request);
  },

  // Submit preset action
  submitPresetPrompt: async (preset: PresetType, options?: any) => {
    const { editor, startStream } = get();
    if (!editor) return;

    const request: AIStreamRequest = {
      messages: buildPresetPromptMessage(editor, preset, options),
      options: getStreamOptions(preset),
    };

    await startStream(request);
  },

  // Retry stream
  retryStream: () => {
    const currentRequest = get().currentRequest;
    if (!currentRequest) return;
    get().startStream(currentRequest);
  },

  // Stop stream
  stopStream: () => {
    get().eventSourceService.stop();
    set({ isStreaming: false, isThinking: false, result: "", resultHtml: "" });
  },
}));

export const useAIPanelStore = createSelectors(store);
