import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { DocumentItem, DocumentTreeItem } from "./type";
import request from "@/lib/request";

interface DocumentTreeState {
  expandedNodes: Set<string>;
  treeData: DocumentTreeItem[];
  loading: boolean;

  updateTreeData: (parentId: string | null, newDocs: DocumentItem[]) => void;
  loadChildren: (parentId: string | null) => void;
  addChildren: (parentId: string | null, docs: DocumentItem[]) => void;
  updateChildren: (parentId: string | null, docs: DocumentItem[]) => void;
  removeChildren: (parentId: string | null, docsToRemove?: DocumentItem[]) => void;
  addChild: (parentId: string | null, doc: DocumentItem) => void;
  removeChild: (parentId: string | null, id: string) => void;
  updateDocument: (id: string, updates: Partial<DocumentItem>) => void;
  getDocument: (id: string) => DocumentTreeItem | null;
  expandNode: (id: string) => void;
  collapseNode: (id: string) => void;
  isNodeExpanded: (id: string) => boolean;
  getDocumentPath: (docId: string | null) => DocumentTreeItem[];
}

export const useDocumentTree = create<DocumentTreeState>()(
  devtools(
    (set, get) => ({
      expandedNodes: new Set<string>(),
      treeData: [],
      loading: false,
      updateTreeData: (parentId, newDocs) => {
        set((state) => {
          const newItems = newDocs.map((doc) => ({
            ...doc,
            isLoaded: false,
            children: [] as DocumentTreeItem[],
          }));

          if (parentId === null) {
            return { treeData: newItems };
          }

          const updatedTree = updateTreeNode(state.treeData, parentId, (node) => ({
            ...node,
            isLoaded: true,
            hasChildren: newItems.length > 0,
            children: newItems,
          }));

          return { treeData: updatedTree };
        });
      },

      loadChildren: async (parentId = null) => {
        const searchParams = new URLSearchParams();
        if (parentId) searchParams.set("parentId", parentId);

        set((state) => ({ loading: true }));

        const data = (await request(`/api/documents/tree${searchParams.toString() ? `?${searchParams.toString()}` : ""}`)) as DocumentItem[];

        set((state) => ({ loading: false }));

        get().updateTreeData(parentId, data);
      },

      addChildren: (parentId, docs) => {
        set((state) => ({
          treeData: addTreeNode(state.treeData, parentId, docs),
        }));
      },

      updateChildren: (parentId, docs) => {
        // TODO:
      },

      removeChildren: (parentId = null, docsToRemove?: DocumentItem[]) => {
        set((state) => {
          if (parentId === null) {
            return { treeData: [] };
          }

          const updatedTree = updateTreeNode(state.treeData, parentId, (node) => ({
            ...node,
            children: docsToRemove ? node.children.filter((child) => !docsToRemove.includes(child)) : [],
            hasChildren: docsToRemove ? node.children.length - docsToRemove.length > 0 : false,
            isLoaded: false,
          }));

          return { treeData: updatedTree };
        });
      },

      addChild: (parentId, doc) => {
        set((state) => ({
          treeData: addTreeNode(state.treeData, parentId, [doc]),
        }));
      },

      removeChild: (parentId, id) => {
        set((state) => ({
          treeData: removeTreeNode(state.treeData, parentId, id),
        }));
      },

      updateDocument: (id, updates) => {
        set((state) => ({
          treeData: updateTreeNode(state.treeData, id, (node) => ({
            ...node,
            ...updates,
          })),
        }));
      },

      getDocument: (id) => {
        return findTreeNode(get().treeData, id);
      },
    }),
    { name: "document-tree-store" },
  ),
);

function addTreeNode(tree: DocumentTreeItem[], parentId: string | null, docs: DocumentItem[]): DocumentTreeItem[] {
  if (parentId === null) {
    return [...tree, ...docs.map((doc) => ({ ...doc, children: [], isLoaded: false, hasChildren: false }))];
  }
  return tree.map((node) => {
    if (node.id === parentId) {
      return { ...node, children: [...node.children, ...docs.map((doc) => ({ ...doc, children: [], isLoaded: false, hasChildren: false }))] };
    }
    return node;
  });
}

function updateTreeNode(tree: DocumentTreeItem[], id: string, updater: (node: DocumentTreeItem) => DocumentTreeItem): DocumentTreeItem[] {
  return tree.map((node) => {
    if (node.id === id) {
      return updater(node);
    }
    if (node.children.length) {
      return {
        ...node,
        children: updateTreeNode(node.children, id, updater),
      };
    }
    return node;
  });
}

function findTreeNode(tree: DocumentTreeItem[], id: string): DocumentTreeItem | null {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children.length) {
      const found = findTreeNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function removeTreeNode(tree: DocumentTreeItem[], parentId: string | null, id: string): DocumentTreeItem[] {
  if (parentId === null) {
    return tree.filter((node) => node.id !== id);
  }

  return tree.map((node) => {
    if (node.id === parentId) {
      return {
        ...node,
        children: node.children.filter((child) => child.id !== id),
      };
    }
    if (node.children.length) {
      return {
        ...node,
        children: removeTreeNode(node.children, parentId, id),
      };
    }
    return node;
  });
}
