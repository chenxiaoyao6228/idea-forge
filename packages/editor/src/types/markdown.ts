import type { Node as UnistNode } from "unist";
import type { Processor } from "unified";
import type { Mark, MarkType, Node, NodeType } from "@tiptap/pm/model";
import type { Data } from "mdast";

export interface Attrs {
  [key: string]: any;
}

export interface MarkdownNode extends UnistNode {
  data?: Data & Record<string, any>;
  children?: Array<MarkdownNode>;
  [key: string]: any;
}

// Placeholder types for parser/serializer state
// These will be properly implemented when we move the parser/serializer
export interface ParserState {
  openNode(type: NodeType, attrs?: Record<string, any>): void;
  closeNode(): void;
  addText(text: string): void;
  openMark(type: MarkType): void;
  closeMark(type: MarkType): void;
  next(children?: Array<MarkdownNode>): void;
}

export interface SerializerState {
  openNode(node: { type: string; [key: string]: any }): void;
  closeNode(): void;
  text(text: string): void;
  next(content: any): void;
}

export interface MarkMarkdownStorage {
  markdown?: {
    parser?: {
      match: (node: MarkdownNode) => boolean;
      apply: (state: ParserState, node: MarkdownNode, type: MarkType) => void;
    };
    serializer?: {
      match: (mark: Mark) => boolean;
      apply: (state: SerializerState, mark: Mark, node: Node) => unknown | boolean;
    };
    hooks?: {
      beforeInit?: (processor: Processor) => Processor;
      afterInit?: (processor: Processor) => Processor;
      beforeParse?: (markdown: string) => string;
      afterParse?: (root: MarkdownNode) => MarkdownNode;
      beforeSerialize?: (root: MarkdownNode) => MarkdownNode;
      afterSerialize?: (markdown: string) => string;
    };
  };
}

export interface NodeMarkdownStorage {
  markdown?: {
    parser?: {
      match: (node: MarkdownNode) => boolean;
      apply: (state: ParserState, node: MarkdownNode, type: NodeType) => void;
    };
    serializer?: {
      match: (node: Node) => boolean;
      apply: (state: SerializerState, node: Node) => void;
    };
    hooks?: {
      beforeInit?: (processor: Processor) => Processor;
      afterInit?: (processor: Processor) => Processor;
      beforeParse?: (markdown: string) => string;
      afterParse?: (root: MarkdownNode) => MarkdownNode;
      beforeSerialize?: (root: MarkdownNode) => MarkdownNode;
      afterSerialize?: (markdown: string) => string;
    };
  };
}

declare module "unist" {
  interface Data {
    hName?: string;
    hProperties?: {
      className?: string[];
    };
  }
}
