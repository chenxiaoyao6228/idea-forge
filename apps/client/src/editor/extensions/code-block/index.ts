/**
 * Client-specific CodeBlock extension that extends the base @idea/editor CodeBlock.
 * Adds React NodeView for mermaid rendering and syntax highlighting plugins.
 */

import { CodeBlock as BaseCodeBlock } from "@idea/editor";
import { ReactNodeViewRenderer } from "@tiptap/react";
import CodeBlockView from "./code-block-view";
import { LowlightPlugin } from "./plugins/lowlight/plugin";
import lowlight from "./plugins/lowlight/lowlight";
import { createCodeBlockVSCodeHandler } from "./plugins/create-code-block-vscode-handler";

export const CodeBlock = BaseCodeBlock.extend({
  addOptions() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {
      ...(this as any).parent?.(),
      defaultLanguage: "mermaid", // Client-specific default
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },

  addProseMirrorPlugins() {
    return [
      LowlightPlugin({
        name: this.name,
        lowlight: lowlight,
        defaultLanguage: this.options.defaultLanguage,
      }),
      // this plugin creates a code block for pasted content from VS Code
      // we can also detect the copied code language
      createCodeBlockVSCodeHandler(this.type),
    ];
  },
});
