import { create } from "zustand";
import { Editor } from "@tiptap/core";
import { EventSourceService } from "@/lib/event-source";
import { PresetType, getStreamOptions, buildUserPromptMessage, buildPresetPromptMessage, markdownToHtml } from "./util";
import { AIStreamRequest } from "@idea/contracts";
import scrollIntoView from "scroll-into-view-if-needed";
import { createSelectorFunctions } from "auto-zustand-selectors-hook";
import useWorkspaceStore from "@/stores/workspace-store";
import { workspaceApi } from "@/apis/workspace";
// import i18next from "i18next";

// localStorage key for persisting selected model per workspace
const getSelectedModelKey = (workspaceId: string) => `ai-selected-model-${workspaceId}`;

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

  // Model Selection States
  availableModels: string[];
  selectedModel: string | null;
  isLoadingModels: boolean;
  hasLoadedModels: boolean; // Track if models have been loaded (to show "no models" message)

  // Basic Actions
  setVisible: (visible: boolean) => void;
  setHasSelection: (hasSelection: boolean) => void;
  setInputFocused: (focused: boolean) => void;
  setPrompt: (prompt: string) => void;
  setEditor: (editor: Editor) => void;

  // Model Selection Actions
  loadAvailableModels: () => Promise<void>;
  setSelectedModel: (model: string | null) => void;

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
  error: null,
  editor: null,
  currentRequest: null,

  // Model Selection States
  availableModels: [],
  selectedModel: null,
  isLoadingModels: false,
  hasLoadedModels: false,

  // Basic State Actions
  setVisible: (visible) => set({ isVisible: visible }),
  setHasSelection: (hasSelection) => set({ hasSelection }),
  setInputFocused: (focused) => set({ isInputFocused: focused }),
  setPrompt: (prompt) => set({ prompt }),
  setEditor: (editor) => set({ editor }),

  // Model Selection Actions
  loadAvailableModels: async () => {
    const workspaceId = useWorkspaceStore.getState().currentWorkspace?.id;
    if (!workspaceId) return;

    set({ isLoadingModels: true });
    try {
      const models = await workspaceApi.getAvailableAIModels(workspaceId);
      set({ availableModels: models, hasLoadedModels: true });

      // Load persisted model selection from localStorage
      const savedModel = localStorage.getItem(getSelectedModelKey(workspaceId));
      if (savedModel && models.includes(savedModel)) {
        set({ selectedModel: savedModel });
      } else if (models.length > 0) {
        // Default to first available model
        set({ selectedModel: models[0] });
        localStorage.setItem(getSelectedModelKey(workspaceId), models[0]);
      }
    } catch (error) {
      console.error("Failed to load available models:", error);
      set({ hasLoadedModels: true }); // Mark as loaded even on error
    } finally {
      set({ isLoadingModels: false });
    }
  },

  setSelectedModel: (model: string | null) => {
    const workspaceId = useWorkspaceStore.getState().currentWorkspace?.id;
    set({ selectedModel: model });

    // Persist to localStorage
    if (workspaceId && model) {
      localStorage.setItem(getSelectedModelKey(workspaceId), model);
    } else if (workspaceId) {
      localStorage.removeItem(getSelectedModelKey(workspaceId));
    }
  },

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
      error: null,
      prompt: "",
    });
  },

  // Handle result confirmation - overwrites selection if exists
  replaceResult: () => {
    const { editor, result } = get();
    if (!editor || !result) return;

    const { selection } = editor.state;
    const { from, to } = selection;

    // Use markdown storage to insert content
    editor.storage.markdown.setAt({ from, to }, result, {
      updateSelection: true,
      preserveWhitespace: true,
      emit: true,
    });

    get().reset();
  },

  // Insert content below - always inserts at current position
  insertBelow: () => {
    const { editor, result } = get();
    if (!editor || !result) return;

    const { selection } = editor.state;
    const $pos = editor.state.doc.resolve(selection.to);

    // Check if current paragraph is empty and not the first node
    const isEmptyParagraph = $pos.parent.content.size === 0;
    const isNotFirstNode = $pos.depth > 0 && $pos.index($pos.depth - 1) > 0;

    if (isEmptyParagraph && isNotFirstNode) {
      // If empty paragraph and not first node, insert before current paragraph
      editor.storage.markdown.setAt($pos.before(), result, {
        updateSelection: true,
        preserveWhitespace: true,
        emit: true,
      });
    } else {
      // Normal case: insert after current paragraph
      const endOfParagraph = $pos.end();
      editor.storage.markdown.setAt(endOfParagraph, "\n" + result, {
        updateSelection: true,
        preserveWhitespace: true,
        emit: true,
      });
    }

    get().reset();
  },

  // Handle result cancellation
  discardResult: () => {
    get().reset();
    get().editor?.commands.focus();
  },

  // Start streaming process
  startStream: async (request: AIStreamRequest, options?: { onComplete?: () => void }) => {
    set({
      currentRequest: request,
      isThinking: true,
      isStreaming: false,
      error: null,
      result: "",
    });

    // Get current workspace ID from workspace store
    const workspaceId = useWorkspaceStore.getState().currentWorkspace?.id;
    // Get selected model from store
    const selectedModel = get().selectedModel;

    await get().eventSourceService.start(
      {
        url: "/api/ai/stream",
        body: {
          ...request,
          workspaceId, // Include workspaceId in request
          modelId: selectedModel, // Include selected model in request
        },
      },
      {
        onMessage: (data) => {
          if (!get().isStreaming) {
            set({ isStreaming: true, isThinking: false });
          }
          const concatenatedResult = get().result + data.content;
          set({ result: concatenatedResult });
        },
        onComplete: () => {
          console.log("handleStreamData", get().result);
          set({
            isStreaming: false,
            isThinking: false,
          });

          // Scroll to confirm buttons after stream is complete and confirm button is visible
          setTimeout(() => {
            const confirmButtons = document.getElementById("ai-confirm-buttons");
            if (confirmButtons) {
              scrollIntoView(confirmButtons, {
                scrollMode: "if-needed",
                block: "nearest",
                behavior: "smooth",
              });
            }
          }, 50);
        },
        onError: (error) => {
          set({
            error: {
              message: error.message,
              action: {
                // label: i18next.t("Retry"),
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
    set({ isStreaming: false, isThinking: false, result: "" });
  },
}));

export const useAIPanelStore = createSelectorFunctions(store);
