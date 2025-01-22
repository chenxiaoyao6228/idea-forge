import type { Editor } from "@tiptap/core";
import type { Processor } from "unified";
import type { Fragment, Mark, Node } from "@tiptap/pm/model";
import type { MarkMarkdownStorage, MarkdownNode, NodeMarkdownStorage } from "../types";
import { SerializerStack } from "./stack";

// Define SerializerState class
export class SerializerState {
  // Declare public readonly properties
  public readonly editor: Editor;
  public readonly processor: Processor;
  // Declare private properties
  private readonly stack: SerializerStack;

  // Constructor
  constructor(editor: Editor, processor: Processor) {
    this.stack = new SerializerStack(editor);
    this.editor = editor;
    this.processor = processor;
  }

  // Serialization method
  public serialize(document: Node) {
    // Process document node
    this.next(document);
    // Serialize Markdown nodes from stack
    let root = this.stack.serialize() as MarkdownNode;
    // Iterate through storage objects, execute beforeSerialize hooks
    for (const storage of Object.values(this.editor.storage as Record<string, NodeMarkdownStorage | MarkMarkdownStorage>)) {
      if (storage?.markdown?.hooks?.beforeSerialize) {
        root = storage.markdown.hooks.beforeSerialize(root);
      }
    }
    // Convert Markdown node to string
    let markdown = this.processor.stringify(root) as string;
    // Iterate through storage objects, execute afterSerialize hooks
    for (const storage of Object.values(this.editor.storage as Record<string, NodeMarkdownStorage | MarkMarkdownStorage>)) {
      if (storage?.markdown?.hooks?.afterSerialize) {
        markdown = storage.markdown.hooks.afterSerialize(markdown);
      }
    }
    return markdown;
  }

  // Process next node or fragment
  public next(nodes: Node | Fragment) {
    if (this.isFragment(nodes)) {
      nodes.forEach((node) => this.runNode(node));
      return this;
    }
    this.runNode(nodes);
    return this;
  }

  // Add node to stack
  public addNode(node: MarkdownNode) {
    this.stack.addNode(node);
    return this;
  }

  // Open new node in stack
  public openNode(node: MarkdownNode) {
    this.stack.openNode(node);
    return this;
  }

  // Close current node in stack
  public closeNode() {
    this.stack.closeNode();
    return this;
  }

  // Process node with mark
  public withMark(mark: Mark, node: MarkdownNode) {
    this.stack.openMark(mark, node);
    return this;
  }

  // Check if node is Fragment type
  private isFragment(node: Node | Fragment): node is Fragment {
    return "size" in node;
  }

  // Process single node
  private runNode(node: Node) {
    // Process all marks of the node
    const next = node.marks.every((mark) => {
      const storage = this.matchNode(mark)?.storage as MarkMarkdownStorage | undefined;
      return !storage?.markdown?.serializer?.apply(this, mark, node);
    });
    // If all marks are processed, process the node itself
    if (next) {
      const storage = this.matchNode(node)?.storage as NodeMarkdownStorage | undefined;
      storage?.markdown?.serializer?.apply(this, node);
    }
    // Close all marks
    for (const mark of node.marks) {
      this.stack.closeMark(mark);
    }
  }

  // Match node with corresponding extension
  private matchNode(node: Node | Mark) {
    const extension = this.editor.extensionManager.extensions.find((e) => {
      const name = e.name;
      const storage = e.storage as MarkMarkdownStorage | NodeMarkdownStorage | undefined;
      return name !== "markdown" && storage?.markdown?.serializer?.match(node as Node & Mark);
    });
    if (!extension) {
      console.warn(`No serializer match ${node.type.name}`);
      return undefined;
    }
    return extension;
  }
}
