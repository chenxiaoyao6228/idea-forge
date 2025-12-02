import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkHtml from "remark-html";
import { ChatMessage } from "@idea/contracts";
import { Editor } from "@tiptap/core";
import { Selection } from "@tiptap/pm/state";
import { DOCUMENT_TITLE_ID, MAX_CONTEXT_LENGTH } from "../constant";

export const PRESET_CONFIGS = {
  // without selected content
  continue_writing: {
    titleContext: true,
    contextBefore: true,
    contextAfter: false,
    contextLength: MAX_CONTEXT_LENGTH, // characters of surrounding context
    maxOutputTokens: MAX_CONTEXT_LENGTH, // tokens for AI response
    systemPrompt: "You are an expert writer who excels at continuing text in a natural and coherent way. Maintain the original style and tone.",
    instruction: "Continue this text naturally:",
  },
  write_outline: {
    titleContext: true,
    contextBefore: true,
    contextAfter: true,
    contextLength: MAX_CONTEXT_LENGTH,
    maxOutputTokens: MAX_CONTEXT_LENGTH,
    systemPrompt: "You are an expert at creating well-structured outlines. Focus on main points and logical organization.",
    instruction: "Create an outline for the content provided",
  },
  write_summary: {
    titleContext: true,
    contextBefore: true,
    contextAfter: true,
    contextLength: MAX_CONTEXT_LENGTH,
    maxOutputTokens: 2000, // summaries are shorter than originals
    systemPrompt: "You are a skilled summarizer. Create concise yet comprehensive summaries while retaining key points.",
    instruction: "Summarize the content provided",
  },
  brainstorm: {
    titleContext: true,
    contextBefore: false,
    contextAfter: false,
    contextLength: 200, // minimal context needed
    maxOutputTokens: MAX_CONTEXT_LENGTH, // ideas can be lengthy
    systemPrompt: "You are a creative idea generator. Think outside the box and provide diverse, innovative suggestions.",
    instruction: "Generate ideas related to the content provided",
  },
  // with selected content
  explain: {
    titleContext: true,
    contextBefore: true,
    contextAfter: true,
    contextLength: 500, // some context for understanding
    maxOutputTokens: MAX_CONTEXT_LENGTH, // explanations can be detailed
    systemPrompt: "You are an expert teacher. Explain concepts clearly and thoroughly, using simple language.",
    instruction: "Explain this content clearly:",
  },
  make_longer: {
    titleContext: true,
    contextBefore: true,
    contextAfter: false,
    contextLength: 500,
    maxOutputTokens: MAX_CONTEXT_LENGTH * 2, // output will be longer than input
    systemPrompt: "You are skilled at expanding content while maintaining quality. Add relevant details and examples.",
    instruction: "Make this content longer while maintaining quality:",
  },
  make_shorter: {
    titleContext: true,
    contextBefore: true,
    contextAfter: true,
    contextLength: 500,
    maxOutputTokens: 2000, // output will be shorter than input
    systemPrompt: "You are an expert at concise writing. Maintain core message while reducing length.",
    instruction: "Make this content more concise:",
  },
  fix_syntax: {
    titleContext: false,
    contextBefore: true,
    contextAfter: true,
    contextLength: 200, // minimal context for grammar fixes
    maxOutputTokens: MAX_CONTEXT_LENGTH, // output similar to input length
    systemPrompt: "You are a grammar and syntax expert. Fix errors while preserving the original meaning.",
    instruction: "Fix any grammar or syntax errors in the content provided",
  },
  translate: {
    titleContext: false,
    contextBefore: true,
    contextAfter: true,
    contextLength: 200, // minimal context for translation
    maxOutputTokens: MAX_CONTEXT_LENGTH * 2, // translations can be longer (esp. CJK <-> Latin)
    systemPrompt: "You are a professional translator. Provide accurate translations while maintaining context and nuance.",
    instruction: "Translate the content provided",
  },
  change_tone: {
    titleContext: true,
    contextBefore: true,
    contextAfter: true,
    contextLength: MAX_CONTEXT_LENGTH,
    maxOutputTokens: MAX_CONTEXT_LENGTH, // similar length to input
    systemPrompt: "You are skilled at adapting writing tone. Maintain content while adjusting style appropriately.",
    instruction: "Adjust the tone of the content provided",
  },
} as const;

export type PresetType = keyof typeof PRESET_CONFIGS;

export function getStreamOptions(preset?: PresetType) {
  return {
    temperature: 0.7,
    max_tokens: preset ? PRESET_CONFIGS[preset].maxOutputTokens : MAX_CONTEXT_LENGTH,
  };
}

export function getEditorSelectedContent(editor: Editor | null, selection?: Selection) {
  if (!editor) return "";

  const currentSelection = selection ?? editor.state.selection;
  const { from, to } = currentSelection;

  return currentSelection.empty ? "" : editor.state.doc.textBetween(from, to);
}

function getBeforeContext(editor: Editor, selection: Selection, contextLength: number) {
  const { from } = selection;
  return editor.state.doc.textBetween(Math.max(0, from - contextLength), from);
}

function getAfterContext(editor: Editor, selection: Selection, contextLength: number) {
  const { to } = selection;
  return editor.state.doc.textBetween(to, Math.min(editor.state.doc.content.size, to + contextLength));
}

export function getDocumentTitle() {
  const title = document.getElementById(DOCUMENT_TITLE_ID)?.textContent;
  return title;
}

export function getDefaultSystemPrompt() {
  return `Please analyze the context information provided in the assistant's message. For language detection:
  1. If there is selected content, respond in the same language as the selected content
  2. If there is no selected content, detect the language from (in order of priority):
         - Document title
         - Previous context
         - Following context
      For example, if these elements are in Chinese, respond in Chinese. If they are in English, respond in English.
      Use all provided context to inform your understanding of the topic.`;
}

export function buildUserPromptMessage(editor: Editor, instruction: string): ChatMessage[] {
  const content = getEditorSelectedContent(editor);

  // Combine context information into a single message
  const contextParts = [`Document title: ${getDocumentTitle()}`, content ? `Selected content: ${content}` : null].filter(Boolean);

  return [
    {
      role: "system",
      content: `You are a helpful AI assistant that follows instructions precisely. ${getDefaultSystemPrompt()}`,
    },
    ...(contextParts.length > 0
      ? [
          {
            role: "assistant",
            content: contextParts.join("\n\n"),
          },
        ]
      : []),
    ...(content ? [{ role: "user", content }] : []),
    { role: "user", content: instruction },
  ].filter(Boolean) as ChatMessage[];
}

export function buildPresetPromptMessage(editor: Editor, preset: PresetType, options?: any): ChatMessage[] {
  const config = PRESET_CONFIGS[preset];
  const content = getEditorSelectedContent(editor);
  const title = config.titleContext ? getDocumentTitle() : null;
  const contextLength = config.contextBefore && config.contextAfter ? MAX_CONTEXT_LENGTH / 2 : MAX_CONTEXT_LENGTH;
  const beforeContext = config.contextBefore ? getBeforeContext(editor, editor.state.selection, contextLength) : null;
  const afterContext = config.contextAfter ? getAfterContext(editor, editor.state.selection, contextLength) : null;

  // Combine context information into a single message
  const contextParts = [
    title && config.titleContext ? `Document title: ${title}` : null,
    beforeContext && config.contextBefore ? `Previous context: ${beforeContext}` : null,
    afterContext && config.contextAfter ? `Following context: ${afterContext}` : null,
  ].filter(Boolean);

  const allOptions = Object.entries(options ?? {}).map(([key, value]) => `${key} is : ${value}`);

  return [
    {
      role: "system",
      content: `${config.systemPrompt} ${getDefaultSystemPrompt()}`,
    },
    ...(contextParts.length > 0
      ? [
          {
            role: "assistant",
            content: `The context information is: ${contextParts.join("\n\n")}`,
          },
        ]
      : []),
    {
      role: "user",
      content: `${config.instruction}, the selected content is ${content ? `"${content}"` : "empty"}. ${allOptions.length ? `, with these options: ${allOptions.join(", ")}` : ""}`,
    },
  ].filter(Boolean) as ChatMessage[];
}

export function markdownToHtml(markdown: string): string {
  const result = unified().use(remarkParse).use(remarkHtml).processSync(markdown);

  return result.toString();
}
