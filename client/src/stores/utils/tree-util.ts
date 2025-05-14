import { CommonDocumentResponse } from "contracts";
import { DocTreeDataNode } from "../doc-store";

export const treeUtils = {
  findParentKey: (nodes: DocTreeDataNode[], targetKey: string): string | null => {
    for (const node of nodes) {
      if (node.children?.some((child) => child.key === targetKey)) {
        return node.key as string;
      }
      if (node.children) {
        const parentKey = treeUtils.findParentKey(node.children as DocTreeDataNode[], targetKey);
        if (parentKey) return parentKey;
      }
    }
    return null;
  },

  updateTreeNodes: (nodes: DocTreeDataNode[], key: string | null, updater: (node: DocTreeDataNode) => DocTreeDataNode): DocTreeDataNode[] => {
    return nodes.map((node) => {
      if (node.key === key) {
        return updater(node);
      }
      if (node.children) {
        return {
          ...node,
          children: treeUtils.updateTreeNodes(node.children as DocTreeDataNode[], key, updater),
        };
      }
      return node;
    });
  },

  removeTreeNode: (nodes: DocTreeDataNode[], key: string): DocTreeDataNode[] => {
    return nodes.filter((node) => {
      if (node.key === key) return false;
      if (node.children) {
        node.children = treeUtils.removeTreeNode(node.children as DocTreeDataNode[], key);
      }
      return true;
    });
  },

  convertToTreeNode: (doc: CommonDocumentResponse): DocTreeDataNode => ({
    ...doc,
    key: doc.id,
    children: doc.isLeaf ? undefined : [],
  }),

  mergeTreeData: (oldNodes: DocTreeDataNode[], newNodes: DocTreeDataNode[]): DocTreeDataNode[] => {
    // Create a map of existing nodes for faster lookup
    const oldNodesMap = new Map(oldNodes.map((node) => [node.key, node]));

    return newNodes.map((newNode) => {
      const existingNode = oldNodesMap.get(newNode.key);
      if (existingNode) {
        // Preserve existing node's children and other properties
        return {
          ...existingNode,
          ...newNode,
          children: newNode.children ? treeUtils.mergeTreeData(existingNode.children || [], newNode.children) : existingNode.children,
        };
      }
      return newNode;
    });
  },

  findNode: (nodes: DocTreeDataNode[], key: string): DocTreeDataNode | null => {
    for (const node of nodes) {
      if (node.key === key) return node;
      if (node.children) {
        const foundNode = treeUtils.findNode(node.children as DocTreeDataNode[], key);
        if (foundNode) return foundNode;
      }
    }
    return null;
  },

  buildTree: (flatDocs: CommonDocumentResponse[]): { nodes: DocTreeDataNode[]; ancestors: string[] } => {
    const nodeMap: Record<string, DocTreeDataNode> = {};
    const nodes: DocTreeDataNode[] = [];
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
