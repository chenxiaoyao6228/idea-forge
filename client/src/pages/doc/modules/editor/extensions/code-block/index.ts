// copy from @tiptap/extension-code-block for adding code highlight and mermaid

import { findParentNode, mergeAttributes, Node, textblockTypeInputRule } from "@tiptap/core";
import { Selection } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";
import CodeBlockView from "./code-block-view";
import { LowlightPlugin } from "./plugins/lowlight/plugin";
import lowlight from "./plugins/lowlight/lowlight";
import { createCodeBlockVSCodeHandler } from "./plugins/create-code-block-vscode-handler";

export interface CodeBlockOptions {
  /**
   * Adds a prefix to language classes that are applied to code tags.
   * @default 'language-'
   */
  languageClassPrefix: string;
  /**
   * Define whether the node should be exited on triple enter.
   * @default true
   */
  exitOnTripleEnter: boolean;
  /**
   * Define whether the node should be exited on arrow down if there is no node after it.
   * @default true
   */
  exitOnArrowDown: boolean;
  /**
   * The default language.
   * @default null
   * @example 'js'
   */
  defaultLanguage: string | null | undefined;
  /**
   * Custom HTML attributes that should be added to the rendered HTML tag.
   * @default {}
   * @example { class: 'foo' }
   */
  HTMLAttributes: Record<string, any>;
  /**
   * Mermaid display configuration.
   * @default 'split'
   */
  mermaidDisplay: "code" | "preview" | "split";
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    codeBlock: {
      /**
       * Set a code block
       * @param attributes Code block attributes
       * @example editor.commands.setCodeBlock({ language: 'javascript' })
       */
      setCodeBlock: (attributes?: { language: string }) => ReturnType;
      /**
       * Toggle a code block
       * @param attributes Code block attributes
       * @example editor.commands.toggleCodeBlock({ language: 'javascript' })
       */
      toggleCodeBlock: (attributes?: { language: string }) => ReturnType;
    };
  }
}

/**
 * Matches a code block with backticks.
 */
export const backtickInputRegex = /^```([a-z]+)?[\s\n]$/;

/**
 * Matches a code block with tildes.
 */
export const tildeInputRegex = /^~~~([a-z]+)?[\s\n]$/;

/**
 * This extension allows you to create code blocks.
 * @see https://tiptap.dev/api/nodes/code-block
 */
export const CodeBlock = Node.create<CodeBlockOptions>({
  name: "codeBlock",

  addOptions() {
    return {
      languageClassPrefix: "language-",
      exitOnTripleEnter: true,
      exitOnArrowDown: true,
      defaultLanguage: "mermaid",
      HTMLAttributes: {
        "data-type": "codeBlock",
      },
      mermaidDisplay: "split",
    };
  },

  content: "text*",

  marks: "",

  group: "block",

  code: true,

  /**
   * Setting defining to true indicates this is a defining node.
   * Defining nodes affect document structure and behavior in several ways:
   * 1. It prevents adjacent non-defining nodes from being merged.
   * 2. It acts as a boundary when auto-wrapping text.
   * 3. It's treated as a single unit in drag-and-drop operations.
   * This setting is important for code blocks as it ensures their integrity and independence.
   */
  defining: true,

  addAttributes() {
    return {
      language: {
        default: this.options.defaultLanguage,
        parseHTML: (element) => element.getAttribute("data-language"),
        renderHTML: (attributes) => ({
          "data-language": attributes.language,
        }),
      },
      mermaidDisplay: {
        default: this.options.mermaidDisplay,
        parseHTML: (element) => element.getAttribute("data-mermaid-display"),
        renderHTML: (attributes) => ({
          "data-mermaid-display": attributes.mermaidDisplay,
        }),
      },
    };
  },

  /**
   * The parseHTML method defines how to parse code block nodes from HTML.
   * It specifies three possible HTML structures to identify code blocks:
   * 1. A standalone <code> tag
   * 2. A <pre> tag, preserving all whitespace characters
   * 3. A <div> tag with "code-block" class that may contain a <code> element
   *
   * For the third case, it also extracts the data-language attribute as the code language.
   */
  parseHTML() {
    return [
      // { tag: 'code' },
      // { tag: 'pre', preserveWhitespace: 'full' },
      {
        tag: 'div[class~="code-block"]',
        preserveWhitespace: "full",
        // @ts-ignore
        contentElement: (node) => node.querySelector("code") || node,
        getAttrs: (node) => ({
          language: node.getAttribute("data-language"),
        }),
      },
    ];
  },

  /**
   * The renderHTML method defines how to render code block nodes to HTML.
   * It creates a nested structure:
   * <div class="code-block [with-line-numbers]" data-language="...">
   *   <pre>
   *     <code spellcheck="false">
   *       [content]
   *     </code>
   *   </pre>
   * </div>
   *
   * This structure allows for more flexible styling, such as adding line numbers or language indicators.
   */
  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      {
        class: `code-block`,
        ...mergeAttributes(HTMLAttributes, {
          "data-language": node.attrs.language,
        }),
      },
      ["pre", ["code", { spellcheck: "false" }, 0]],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },

  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        parser: {
          match: (node) => node.type === "code",
          apply: (state, node, type) => {
            const language = node.lang as string;
            const value = node.value as string;
            state.openNode(type, { language });
            state.addText(value);
            state.closeNode();
          },
        },
        serializer: {
          match: (node) => node.type.name === this.name,
          apply: (state, node) => {
            state.addNode({
              type: "code",
              value: node.content.firstChild?.text || "",
              lang: node.attrs.language,
            });
          },
        },
      },
    };
  },

  addCommands() {
    return {
      setCodeBlock:
        (attributes) =>
        ({ commands }) => {
          return commands.setNode(this.name, attributes);
        },
      toggleCodeBlock:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleNode(this.name, "paragraph", attributes);
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Alt-c": () => this.editor.commands.toggleCodeBlock(),

      // remove code block when at start of document or code block is empty
      Backspace: () => {
        const { empty, $anchor } = this.editor.state.selection;
        const isAtStart = $anchor.pos === 1;

        if (!empty || $anchor.parent.type.name !== this.name) {
          return false;
        }

        if (isAtStart || !$anchor.parent.textContent.length) {
          return this.editor.commands.clearNodes();
        }

        return false;
      },

      // exit node on triple enter
      Enter: ({ editor }) => {
        if (!this.options.exitOnTripleEnter) {
          return false;
        }

        const { state } = editor;
        const { selection } = state;
        const { $from, empty } = selection;

        if (!empty || $from.parent.type !== this.type) {
          return false;
        }

        const isAtEnd = $from.parentOffset === $from.parent.nodeSize - 2;
        const endsWithDoubleNewline = $from.parent.textContent.endsWith("\n\n");

        if (!isAtEnd || !endsWithDoubleNewline) {
          return false;
        }

        return editor
          .chain()
          .command(({ tr }) => {
            tr.delete($from.pos - 2, $from.pos);

            return true;
          })
          .exitCode()
          .run();
      },

      // exit node on arrow down
      ArrowDown: ({ editor }) => {
        if (!this.options.exitOnArrowDown) {
          return false;
        }

        const { state } = editor;
        const { selection, doc } = state;
        const { $from, empty } = selection;

        if (!empty || $from.parent.type !== this.type) {
          return false;
        }

        const isAtEnd = $from.parentOffset === $from.parent.nodeSize - 2;

        if (!isAtEnd) {
          return false;
        }

        const after = $from.after();

        if (after === undefined) {
          return false;
        }

        const nodeAfter = doc.nodeAt(after);

        if (nodeAfter) {
          return editor.commands.command(({ tr }) => {
            tr.setSelection(Selection.near(doc.resolve(after)));
            return true;
          });
        }

        return editor.commands.exitCode();
      },

      // select all code in code block
      "Mod-a": ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        if ($from.parent.type !== this.type) {
          return false;
        }

        const codeBlock = findParentNode((node) => node.type.name === this.name)(selection);

        if (!codeBlock) return false;

        editor.commands.setTextSelection({
          from: codeBlock.pos + 1,
          to: codeBlock.pos + codeBlock.node.nodeSize - 1,
        });

        return true;
      },
    };
  },

  addInputRules() {
    return [
      textblockTypeInputRule({
        find: backtickInputRegex,
        type: this.type,
        getAttributes: (match) => ({
          language: match[1],
        }),
      }),
      textblockTypeInputRule({
        find: tildeInputRegex,
        type: this.type,
        getAttributes: (match) => ({
          language: match[1],
        }),
      }),
    ];
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
