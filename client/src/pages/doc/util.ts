import { TreeDataNode } from "@/components/ui/tree";
import { CommonDocumentResponse } from "shared";

export const treeUtils = {
  findParentKey: (nodes: TreeDataNode[], targetKey: string): string | null => {
    for (const node of nodes) {
      if (node.children?.some((child) => child.key === targetKey)) {
        return node.key as string;
      }
      if (node.children) {
        const parentKey = treeUtils.findParentKey(node.children, targetKey);
        if (parentKey) return parentKey;
      }
    }
    return null;
  },

  updateTreeNodes: (nodes: TreeDataNode[], key: string | null, updater: (node: TreeDataNode) => TreeDataNode): TreeDataNode[] => {
    return nodes.map((node) => {
      if (node.key === key) {
        return updater(node);
      }
      if (node.children) {
        return { ...node, children: treeUtils.updateTreeNodes(node.children, key, updater) };
      }
      return node;
    });
  },

  removeTreeNode: (nodes: TreeDataNode[], key: string): TreeDataNode[] => {
    return nodes.filter((node) => {
      if (node.key === key) return false;
      if (node.children) {
        node.children = treeUtils.removeTreeNode(node.children, key);
      }
      return true;
    });
  },

  convertToTreeNode: (doc: CommonDocumentResponse): TreeDataNode => ({
    ...doc,
    key: doc.id,
    children: doc.isLeaf ? undefined : [],
  }),

  mergeTreeData: (oldNodes: TreeDataNode[], newNodes: TreeDataNode[]): TreeDataNode[] => {
    return newNodes.map((newNode) => {
      const existingNode = oldNodes.find((old) => old.key === newNode.key);
      if (existingNode?.children?.length) {
        return {
          ...newNode,
          children: existingNode.children,
        };
      }
      return newNode;
    });
  },

  findNode: (nodes: TreeDataNode[], key: string): TreeDataNode | null => {
    for (const node of nodes) {
      if (node.key === key) return node;
      if (node.children) {
        const foundNode = treeUtils.findNode(node.children, key);
        if (foundNode) return foundNode;
      }
    }
    return null;
  },

  buildTree: (flatDocs: CommonDocumentResponse[]): { nodes: TreeDataNode[]; ancestors: string[] } => {
    const nodeMap: Record<string, TreeDataNode> = {};
    const nodes: TreeDataNode[] = [];
    const ancestors: string[] = [];

    // First pass: Create all nodes
    flatDocs.forEach((doc) => {
      nodeMap[doc.id] = treeUtils.convertToTreeNode(doc);
      if (doc.parentId && !ancestors.includes(doc.parentId)) {
        ancestors.push(doc.parentId);
      }
    });

    // Second pass: Build relationships
    flatDocs.forEach((doc) => {
      const node = nodeMap[doc.id];
      if (doc.parentId === null) {
        nodes.push(node);
      } else {
        const parent = nodeMap[doc.parentId];
        if (parent) {
          parent.children?.push(node);
        }
      }
    });

    return {
      nodes,
      ancestors,
    };
  },
};
