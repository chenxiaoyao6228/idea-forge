import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { TreeDataNode } from "@/components/ui/tree";
import { documentApi } from "@/apis/document";
import { CommonDocumentResponse, MoveDocumentsDto, UpdateDocumentDto } from "shared";

interface DocumentTreeState {
  expandedKeys: string[];
  selectedKeys: string[];
  loading: boolean;
  treeData: TreeDataNode[];

  // actions
  setExpandedKeys: (keys: string[]) => void;
  setSelectedKeys: (keys: string[]) => void;
  loadChildren: (key: string | null) => Promise<void>;
  selectDocuments: (keys: string[]) => void;
  createDocument: (parentId: string | null, title: string) => Promise<string>;
  deleteDocument: (id: string) => Promise<void>;
  updateDocument: (id: string, update: UpdateDocumentDto) => Promise<void>;
  moveDocuments: (data: MoveDocumentsDto) => Promise<void>;
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
          const data = await documentApi.getTree(key || undefined);
          const treeNodes = data.map(treeUtils.convertToTreeNode);

          set((state) => ({
            treeData:
              key === null
                ? treeNodes
                : treeUtils.updateTreeNodes(state.treeData, key, (node) => ({
                    ...node,
                    children: treeNodes,
                  })),
            loading: false,
          }));
        } catch (error) {
          console.error("Failed to load children:", error);
          set({ loading: false });
        }
      },

      createDocument: async (parentId, title) => {
        const response = await documentApi.create({
          parentId: parentId || null,
          title,
          content: "",
          sharedPassword: null,
        });

        const newNode = treeUtils.convertToTreeNode(response);

        set((state) => {
          const newExpandedKeys = parentId ? [...new Set([...state.expandedKeys, parentId])] : state.expandedKeys;

          if (!parentId) {
            return {
              treeData: [...state.treeData, newNode],
              expandedKeys: newExpandedKeys,
              selectedKeys: [newNode.key],
            };
          }

          return {
            treeData: treeUtils.updateTreeNodes(state.treeData, parentId, (node) => ({
              ...node,
              children: [...(node.children || []), newNode],
              isLeaf: false,
            })),
            expandedKeys: newExpandedKeys,
            selectedKeys: [newNode.key],
          };
        });

        if (parentId) {
          const data = await documentApi.getTree(parentId);
          set((state) => ({
            treeData: treeUtils.updateTreeNodes(state.treeData, parentId, (node) => ({
              ...node,
              children: treeUtils.mergeTreeData(node.children || [], data.map(treeUtils.convertToTreeNode)),
            })),
          }));
        }

        return response.id;
      },

      deleteDocument: async (id) => {
        const parentKey = treeUtils.findParentKey(get().treeData, id);

        set((state) => ({
          treeData: treeUtils.removeTreeNode(state.treeData, id),
          selectedKeys: state.selectedKeys.includes(id) && parentKey ? [parentKey] : state.selectedKeys.filter((k) => k !== id),
        }));

        await documentApi.delete(id);

        if (parentKey) {
          const data = await documentApi.getTree(parentKey);
          set((state) => ({
            treeData: treeUtils.updateTreeNodes(state.treeData, parentKey, (node) => ({
              ...node,
              children: treeUtils.mergeTreeData(node.children || [], data.map(treeUtils.convertToTreeNode)),
            })),
          }));
        }
      },

      updateDocument: async (id, update) => {
        await documentApi.update(id, update);

        set((state) => ({
          treeData: treeUtils.updateTreeNodes(state.treeData, id, (node) => ({ ...node, ...update })),
        }));
      },

      moveDocuments: async ({ id, targetId, dropPosition }) => {
        try {
          const result = (await documentApi.moveDocuments({
            id,
            targetId,
            dropPosition,
          })) as any;

          // 如果返回了新旧树结构，分别更新
          if ("oldTree" in result && "newTree" in result) {
            const { oldTree, newTree } = result;
            set((state) => {
              let newTreeData = [...state.treeData];

              // 更新原位置的树
              if (oldTree.length > 0) {
                const oldParentId = treeUtils.findParentKey(state.treeData, id);
                newTreeData = treeUtils.updateTreeNodes(newTreeData, oldParentId, (node) => ({
                  ...node,
                  children: oldTree.map(treeUtils.convertToTreeNode),
                }));
              }

              // 更新新位置的树
              if (newTree.length > 0) {
                const newParentId = treeUtils.findParentKey(newTree, targetId);
                newTreeData = treeUtils.updateTreeNodes(newTreeData, newParentId, (node) => ({
                  ...node,
                  children: newTree.map(treeUtils.convertToTreeNode),
                }));
              }

              return { treeData: newTreeData };
            });
          } else {
            // 如果是同级移动，直接更新整个树
            set({ treeData: result.map(treeUtils.convertToTreeNode) });
          }
        } catch (error) {
          console.error("Failed to move documents:", error);
          throw error;
        }
      },
    }),
    { name: "document-tree-store" },
  ),
);

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
    children: [],
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
};
