import { type Processor, unified } from "unified";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import remarkDirective from "remark-directive";
import type { Node } from "@tiptap/pm/model";
import { Extension } from "@tiptap/core";
import { ParserState } from "./parser/state";
import { SerializerState } from "./serializer/state";
import type { MarkMarkdownStorage, NodeMarkdownStorage } from "./types";
import { Selection } from "@tiptap/pm/state";
import { createMarkdownPasteHandler } from "./plugins/create-markdown-paste-handler";

export * from "./types";

export type MarkdownOptions = {};

export interface MarkdownStorage {
  get: () => string;
  set: (markdown: string, emit?: boolean) => void;
  setAt: (
    position: number | { from: number; to: number },
    markdown: string,
    options?: {
      updateSelection?: boolean;
      preserveWhitespace?: boolean;
      emit?: boolean;
    },
  ) => void;
  parse: (markdown: string) => Node | null;
  serialize: (document: Node) => string;
  processor: Processor;
}

export const Markdown = Extension.create<MarkdownOptions, MarkdownStorage>({
  name: "markdown",
  addStorage() {
    return {} as MarkdownStorage;
  },
  addProseMirrorPlugins() {
    return [createMarkdownPasteHandler(this.editor)];
  },
  onBeforeCreate() {
    // processor
    this.storage.processor = unified().use(remarkParse).use(remarkStringify).use(remarkGfm).use(remarkDirective) as unknown as Processor;
    for (const [key, value] of Object.entries(this.editor.storage as Record<string, NodeMarkdownStorage | MarkMarkdownStorage>)) {
      if (key !== this.name && value?.markdown?.hooks?.beforeInit) {
        this.storage.processor = value.markdown.hooks.beforeInit(this.storage.processor);
      }
    }
    for (const [key, value] of Object.entries(this.editor.storage as Record<string, NodeMarkdownStorage | MarkMarkdownStorage>)) {
      if (key !== this.name && value?.markdown?.hooks?.afterInit) {
        this.storage.processor = value.markdown.hooks.afterInit(this.storage.processor);
      }
    }
    // parser
    this.storage.parse = (markdown: string) => {
      // Handle empty or whitespace-only content
      if (!markdown?.trim()) {
        return this.editor.schema.node("doc", null, [this.editor.schema.node("paragraph")]);
      }

      return new ParserState(this.editor, this.storage.processor).parse(markdown);
    };
    // serializer
    this.storage.serialize = (document: Node) => {
      return new SerializerState(this.editor, this.storage.processor).serialize(document);
    };
    // get
    this.storage.get = () => {
      return this.editor.storage[this.name].serialize(this.editor.state.doc) as string;
    };
    // set - replaces entire document
    this.storage.set = (markdown: string, emit?: boolean) => {
      const tr = this.editor.state.tr;
      const doc = this.editor.storage[this.name].parse(markdown);
      if (!doc) return;
      this.editor.view.dispatch(tr.replaceWith(0, tr.doc.content.size, doc).setMeta("preventUpdate", !emit));
    };
    // setAt - supports multiple insertion patterns
    this.storage.setAt = (
      position: number | { from: number; to: number },
      markdown: string,
      options: {
        updateSelection?: boolean;
        preserveWhitespace?: boolean;
        emit?: boolean;
      } = {},
    ) => {
      const tr = this.editor.state.tr;
      const doc = this.editor.storage[this.name].parse(markdown);
      if (!doc) return;

      // Handle position variants
      let from: number;
      let to: number;

      if (typeof position === "number") {
        from = to = position;
      } else {
        from = position.from;
        to = position.to;
      }

      // Insert content
      tr.replaceWith(from, to, doc);

      // Handle selection update
      if (options.updateSelection) {
        const resolvedPos = tr.doc.resolve(from + doc.content.size);
        tr.setSelection(Selection.near(resolvedPos));
      }

      // Handle emit option
      tr.setMeta("preventUpdate", !options.emit);

      this.editor.view.dispatch(tr);
    };
  },
});
