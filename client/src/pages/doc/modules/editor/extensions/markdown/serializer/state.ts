import type { Editor } from "@tiptap/core";
import type { Processor } from "unified";
import type { Fragment, Mark, Node } from "@tiptap/pm/model";
import type { MarkMarkdownStorage, MarkdownNode, NodeMarkdownStorage } from "../types";
import { SerializerStack } from "./stack";

// 定义 SerializerState 类
export class SerializerState {
  // 声明公共只读属性
  public readonly editor: Editor;
  public readonly processor: Processor;
  // 声明私有属性
  private readonly stack: SerializerStack;

  // 构造函数
  constructor(editor: Editor, processor: Processor) {
    this.stack = new SerializerStack(editor);
    this.editor = editor;
    this.processor = processor;
  }

  // 序列化方法
  public serialize(document: Node) {
    // 处理文档节点
    this.next(document);
    // 从栈中序列化 Markdown 节点
    let root = this.stack.serialize() as MarkdownNode;
    // 遍历存储对象，执行 beforeSerialize 钩子
    for (const storage of Object.values(this.editor.storage as Record<string, NodeMarkdownStorage | MarkMarkdownStorage>)) {
      if (storage?.markdown?.hooks?.beforeSerialize) {
        root = storage.markdown.hooks.beforeSerialize(root);
      }
    }
    // 将 Markdown 节点转换为字符串
    let markdown = this.processor.stringify(root) as string;
    // 遍历存储对象，执行 afterSerialize 钩子
    for (const storage of Object.values(this.editor.storage as Record<string, NodeMarkdownStorage | MarkMarkdownStorage>)) {
      if (storage?.markdown?.hooks?.afterSerialize) {
        markdown = storage.markdown.hooks.afterSerialize(markdown);
      }
    }
    return markdown;
  }

  // 处理下一个节点或片段
  public next(nodes: Node | Fragment) {
    if (this.isFragment(nodes)) {
      nodes.forEach((node) => this.runNode(node));
      return this;
    }
    this.runNode(nodes);
    return this;
  }

  // 向栈中添加节点
  public addNode(node: MarkdownNode) {
    this.stack.addNode(node);
    return this;
  }

  // 在栈中打开新节点
  public openNode(node: MarkdownNode) {
    this.stack.openNode(node);
    return this;
  }

  // 关闭栈中当前节点
  public closeNode() {
    this.stack.closeNode();
    return this;
  }

  // 处理带标记的节点
  public withMark(mark: Mark, node: MarkdownNode) {
    this.stack.openMark(mark, node);
    return this;
  }

  // 判断是否为 Fragment 类型
  private isFragment(node: Node | Fragment): node is Fragment {
    return Object.hasOwn(node, "size");
  }

  // 处理单个节点
  private runNode(node: Node) {
    // 处理节点的所有标记
    const next = node.marks.every((mark) => {
      const storage = this.matchNode(mark)?.storage as MarkMarkdownStorage | undefined;
      return !storage?.markdown?.serializer?.apply(this, mark, node);
    });
    // 如果所有标记都处理完毕，处理节点本身
    if (next) {
      const storage = this.matchNode(node)?.storage as NodeMarkdownStorage | undefined;
      storage?.markdown?.serializer?.apply(this, node);
    }
    // 关闭所有标记
    for (const mark of node.marks) {
      this.stack.closeMark(mark);
    }
  }

  // 匹配节点对应的扩展
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
