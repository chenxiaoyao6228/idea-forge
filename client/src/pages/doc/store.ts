import { TreeDataNode } from "@/components/ui/tree";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { DocumentItem } from "./type";
import request from "@/lib/request";
import { CommonDocument } from "shared";

interface DocumentTreeState {
  expandedKeys: string[];
  selectedKeys: string[];
  treeData: TreeDataNode[];
  loading: boolean;

  setExpandedKeys: (keys: string[]) => void;
  setSelectedKeys: (keys: string[]) => void;
  loadChildren: (key: string | null) => Promise<void>;
  selectDocuments: (keys: string[]) => void;
  createDocument: (parentId: string | null, title: string) => Promise<string>;
  deleteDocument: (id: string) => Promise<void>;
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

      selectDocuments: (keys) => set({ selectedKeys: keys }),

      loadChildren: async (key = null) => {
        set({ loading: true });
        try {
          const searchParams = new URLSearchParams();
          if (key) searchParams.set("parentId", String(key));

          const data = (await request(`/api/documents/tree${searchParams.toString() ? `?${searchParams.toString()}` : ""}`)) as DocumentItem[];

          const treeNodes = data.map(
            (doc): TreeDataNode => ({
              ...doc,
              key: doc.id,
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
          parentId: parentId || undefined,
          title,
          content: "",
        })) as CommonDocument;

        set((state) => {
          const newExpandedKeys = parentId ? [...new Set([...state.expandedKeys, parentId])] : state.expandedKeys;

          if (!parentId) {
            return {
              treeData: [...state.treeData, { ...response, key: response.id }],
              expandedKeys: newExpandedKeys,
              selectedKeys: [response.id],
            };
          }

          const updateChildren = (nodes: TreeDataNode[]): TreeDataNode[] => {
            return nodes.map((node) => {
              if (node.key === parentId) {
                return {
                  ...node,
                  children: [...(node.children || []), { ...response, key: response.id }],
                  isLeaf: false,
                };
              }
              if (node.children) {
                return { ...node, children: updateChildren(node.children) };
              }
              return node;
            });
          };

          return {
            treeData: updateChildren(state.treeData),
            expandedKeys: newExpandedKeys,
            selectedKeys: [response.id],
          };
        });

        if (parentId) {
          const data = (await request(`/api/documents/tree?parentId=${parentId}`)) as DocumentItem[];

          set((state) => {
            const mergeChildren = (nodes: TreeDataNode[]): TreeDataNode[] => {
              return nodes.map((node) => {
                if (node.key === parentId) {
                  const existingChildren = node.children || [];
                  const newChildren = data.map(
                    (doc: DocumentItem): TreeDataNode => ({
                      ...doc,
                      key: doc.id,
                      title: doc.title,
                      isLeaf: doc.isLeaf,
                      children: existingChildren.find((child) => child.key === doc.id)?.children || [],
                    }),
                  );

                  return { ...node, children: newChildren };
                }
                if (node.children) {
                  return { ...node, children: mergeChildren(node.children) };
                }
                return node;
              });
            };

            return {
              treeData: mergeChildren(state.treeData),
            };
          });
        }

        return response.id;
      },

      deleteDocument: async (id: string) => {
        const findParentKey = (nodes: TreeDataNode[], targetKey: string): string | null => {
          for (const node of nodes) {
            if (node.children?.some((child) => child.key === targetKey)) {
              return node.key;
            }
            if (node.children) {
              const parentKey = findParentKey(node.children, targetKey);
              if (parentKey) return parentKey;
            }
          }
          return null;
        };

        const parentKey = findParentKey(get().treeData, id);

        set((state) => {
          const removeNode = (nodes: TreeDataNode[]): TreeDataNode[] => {
            return nodes.filter((node) => {
              if (node.key === id) return false;
              if (node.children) {
                node.children = removeNode(node.children);
              }
              return true;
            });
          };

          const newSelectedKeys = state.selectedKeys.includes(id) && parentKey ? [parentKey] : state.selectedKeys.filter((k) => k !== id);

          return {
            treeData: removeNode(state.treeData),
            selectedKeys: newSelectedKeys,
          };
        });

        await request.delete(`/api/documents/${id}`);

        if (parentKey) {
          const data = (await request(`/api/documents/tree?parentId=${parentKey}`)) as DocumentItem[];

          set((state) => {
            const mergeChildren = (nodes: TreeDataNode[]): TreeDataNode[] => {
              return nodes.map((node) => {
                if (node.key === parentKey) {
                  const existingChildren = node.children || [];
                  const newChildren = data.map(
                    (doc: DocumentItem): TreeDataNode => ({
                      ...doc,
                      key: doc.id,
                      children: existingChildren.find((child) => child.key === doc.id)?.children || [],
                    }),
                  );
                  return { ...node, children: newChildren };
                }
                if (node.children) {
                  return { ...node, children: mergeChildren(node.children) };
                }
                return node;
              });
            };

            return { treeData: mergeChildren(state.treeData) };
          });
        }
      },
    }),
    { name: "document-tree-store" },
  ),
);
