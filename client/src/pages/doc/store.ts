import { Key } from "react";
import { TreeDataNode } from "@/components/ui/tree";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { DocumentItem, DocumentTreeItem } from "./type";
import request from "@/lib/request";
import { CreateDocumentResponse } from "shared";

interface DocumentTreeState {
  expandedKeys: Key[];
  selectedKeys: Key[];
  treeData: TreeDataNode[];
  loading: boolean;

  setExpandedKeys: (keys: Key[]) => void;
  setSelectedKeys: (keys: Key[]) => void;
  loadChildren: (key: Key | null) => Promise<void>;
  createDocument: (parentId: string | null, title: string) => Promise<void>;
}

export const useDocumentTree = create<DocumentTreeState>()(
  devtools(
    (set, get) => ({
      expandedKeys: [],
      selectedKeys: [],
      treeData: [],
      loading: false,

      setExpandedKeys: (keys) => set({ expandedKeys: keys }),
      setSelectedKeys: (keys) => set({ selectedKeys: keys }),

      loadChildren: async (key = null) => {
        set({ loading: true });
        try {
          const searchParams = new URLSearchParams();
          if (key) searchParams.set("parentId", String(key));

          const data = (await request(`/api/documents/tree${searchParams.toString() ? `?${searchParams.toString()}` : ""}`)) as DocumentTreeItem[];

          const treeNodes = data.map(
            (doc: DocumentItem): TreeDataNode => ({
              key: doc.id,
              title: doc.title,
              isLeaf: doc.isLeaf,
              children: [],
            }),
          );

          set((state) => {
            if (key === null) {
              return { treeData: treeNodes, loading: false };
            }

            const updateChildren = (nodes: TreeDataNode[]): TreeDataNode[] => {
              return nodes.map((node) => {
                if (node.key === key) {
                  return { ...node, children: treeNodes };
                }
                if (node.children) {
                  return { ...node, children: updateChildren(node.children) };
                }
                return node;
              });
            };

            return {
              treeData: updateChildren(state.treeData),
              loading: false,
            };
          });
        } catch (error) {
          console.error("Failed to load children:", error);
          set({ loading: false });
        }
      },

      createDocument: async (parentId: string | null, title: string) => {
        const response = (await request.post("/api/documents", {
          parentId,
          title,
          content: "",
        })) as CreateDocumentResponse;

        set((state) => {
          const newNode: TreeDataNode = {
            ...response,
            key: response.id,
            children: [],
          };

          if (!parentId) {
            return { treeData: [...state.treeData, newNode] };
          }

          const updateChildren = (nodes: TreeDataNode[]): TreeDataNode[] => {
            return nodes.map((node) => {
              if (node.key === parentId) {
                return {
                  ...node,
                  children: [...(node.children || []), newNode],
                  isLeaf: false,
                };
              }
              if (node.children) {
                return { ...node, children: updateChildren(node.children) };
              }
              return node;
            });
          };

          return { treeData: updateChildren(state.treeData) };
        });
      },
    }),
    { name: "document-tree-store" },
  ),
);
