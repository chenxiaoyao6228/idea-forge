import { create } from "zustand";
import { Editor } from "@tiptap/core";
import { EventSourceService } from "@/lib/event-source";
import createSelectors from "@/stores/utils/createSelector";

interface AIPanelState {
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
  error: {
    message: string;
    action: {
      label: string;
      handler: () => void;
    };
  } | null;

  // Editor Reference
  editor: Editor | null;

  // Actions
  setVisible: (visible: boolean) => void;
  setHasSelection: (hasSelection: boolean) => void;
  setInputFocused: (focused: boolean) => void;
  setPrompt: (prompt: string) => void;
  setEditor: (editor: Editor) => void;

  // Complex Actions
  handleStreamData: (content: string) => void;
  handleError: (message: string) => void;
  reset: () => void;
  confirmResult: () => void;
  cancelResult: () => void;
  startStream: (prompt: string) => Promise<void>;
  stopStream: () => void;
  retryStream: () => void;
  insertBelow: () => void;
}

export const store = create<AIPanelState>((set, get) => ({
  eventSourceService: new EventSourceService(),
  // Initial States
  isVisible: false,
  hasSelection: false,
  isInputFocused: false,
  prompt: "",
  isThinking: false,
  isStreaming: false,
  result: "",
  error: null,
  editor: null,

  // Basic Actions
  setVisible: (visible) => set({ isVisible: visible }),
  setHasSelection: (hasSelection) => set({ hasSelection }),
  setInputFocused: (focused) => set({ isInputFocused: focused }),
  setPrompt: (prompt) => set({ prompt }),
  setEditor: (editor) => set({ editor }),

  handleStreamData: (content) => {
    set((state) => ({
      result: state.result + content,
    }));
  },

  handleError: (message) => {
    const state = get();
    set({
      isThinking: false,
      error: {
        message,
        action: {
          label: "Retry",
          handler: () => get().startStream(state.prompt),
        },
      },
    });
  },

  reset: () => {
    set({
      hasSelection: false,
      isVisible: false,
      isInputFocused: false,
      isThinking: false,
      isStreaming: false,
      result: "",
      error: null,
      prompt: "",
    });
  },

  confirmResult: () => {
    const { editor, result } = get();
    if (editor && result) {
      // If the result contains multiple lines, insert each line and enter a new line after each line
      if (result.includes("\n")) {
        const lines = result.split("\n");
        lines.forEach((line) => {
          if (!line) {
            return;
          }
          editor.commands.insertContent(line);
          if (line !== lines[lines.length - 1]) {
            editor.commands.enter();
          }
        });
      } else {
        // If the result is a single line, insert it and enter a new line
        editor.commands.insertContent(result);
      }
      get().reset();
    }
  },

  cancelResult: () => {
    get().reset();
  },

  startStream: async (prompt: string) => {
    set({
      isThinking: true,
      isStreaming: false,
      error: null,
      result: "",
      prompt: "",
    });

    await get().eventSourceService.start(
      {
        url: "/api/ai/stream",
        body: { prompt },
      },
      {
        onMessage: (data) => {
          if (!get().isStreaming) {
            set({ isStreaming: true, isThinking: false });
          }
          set((state) => ({
            result: state.result + data.content,
          }));
        },
        onComplete: () => {
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
                handler: () => get().startStream(prompt),
              },
            },
            isStreaming: false,
            isThinking: false,
          });
        },
      },
    );
  },

  retryStream: () => {
    get().startStream(get().prompt);
  },

  stopStream: () => {
    get().eventSourceService.stop();
    set({
      isStreaming: false,
      isThinking: false,
    });
  },

  insertBelow: () => {
    const { editor, result } = get();
    if (editor && result) {
      editor.commands.insertContent(result);
    }
    get().reset();
    set({ isVisible: false });
  },
}));

export const useAIPanelStore = createSelectors(store);
