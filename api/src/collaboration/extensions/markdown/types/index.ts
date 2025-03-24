import type { Node as UnistNode } from "unist";
import type { Processor } from "unified";
import type { Mark, MarkType, Node, NodeType } from "@tiptap/pm/model";
import type { Data } from "mdast";
import type { ParserState } from "../parser/state";
import type { SerializerState } from "../serializer/state";

export interface Attrs {
  [key: string]: any;
}

export interface MarkdownNode extends UnistNode {
  data?: Data & Record<string, any>;
  children?: Array<MarkdownNode>;
  [key: string]: any;
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
