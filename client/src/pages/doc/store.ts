import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { TreeDataNode } from "@/components/ui/tree";
import { documentApi } from "@/apis/document";
import { CommonDocumentResponse, MoveDocumentsDto, UpdateDocumentDto } from "shared";
import createSelectors from "@/stores/utils/createSelector";

interface DocTreeDataNode extends TreeDataNode {
  content?: string;
}

interface DocumentTreeState {
  expandedKeys: string[];
  selectedKeys: string[];
  loading: boolean;
  treeData: DocTreeDataNode[];

  // actions
  getCurrentDocument: () => CommonDocumentResponse | null;
  setExpandedKeys: (keys: string[]) => void;
  setSelectedKeys: (keys: string[]) => void;
  setCurrentDocument: (doc: DocTreeDataNode) => void;
  loadChildren: (key: string | null) => Promise<void>;
  createDocument: (parentId: string | null, title: string) => Promise<string>;
  deleteDocument: (id: string) => Promise<void>;
  moveDocuments: (data: MoveDocumentsDto) => Promise<void>;
  loadCurrentDocument: (id: string) => Promise<void>;
  loadNestedTree: (key: string | null) => Promise<void>;
  updateCurrentDocument: (update: UpdateDocumentDto) => void;
  updateDocument: (id: string, update: UpdateDocumentDto) => Promise<void>;
}

export const store = create<DocumentTreeState>()(
  devtools(
    (set, get) => ({
      expandedKeys: [],
      selectedKeys: [],
      treeData: [],
      loading: false,

      setExpandedKeys: (keys) => set({ expandedKeys: keys }),

      setSelectedKeys: (keys) => set({ selectedKeys: keys }),

      updateCurrentDocument: async (update) => {
        const curId = get().selectedKeys[0];
        if (!curId) return;
        await get().updateDocument(curId, update);
      },

      loadNestedTree: async (key = null) => {
        set({ loading: true });
        try {
          const data = await documentApi.getNestedTree(key || undefined);
          const { nodes, ancestors } = treeUtils.buildTree(data);
          set({ treeData: nodes, expandedKeys: ancestors });
        } catch (error) {
          console.error("Failed to load nested tree:", error);
        } finally {
          set({ loading: false });
        }
      },

      loadChildren: async (key = null) => {
        set({ loading: true });
        try {
          const data = await documentApi.getChildren(key || undefined);
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

      loadCurrentDocument: async (id) => {
        set({ loading: true, selectedKeys: [id] });
        try {
          const doc = await documentApi.getDocument(id);
          set((state) => ({
            treeData: treeUtils.updateTreeNodes(state.treeData, id, (node) => ({ ...node, ...doc })),
          }));
        } catch (error) {
          console.error("Failed to load current document:", error);
        } finally {
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
        try {
          set({ loading: true });
          await documentApi.update(id, update);

          set((state) => ({
            treeData: treeUtils.updateTreeNodes(get().treeData, id, (node) => ({ ...node, ...update })),
          }));
        } catch (error) {
          console.error("Failed to update document:", error);
        } finally {
          set({ loading: false });
        }
      },

      moveDocuments: async ({ id, targetId, dropPosition }) => {
        try {
          const parentId = treeUtils.findParentKey(get().treeData, id);

          const result = (await documentApi.moveDocuments({
            id,
            targetId,
            dropPosition,
          })) as any;

          if ("oldTree" in result && "newTree" in result) {
            const { oldTree, newTree } = result;
            set((state) => {
              let newTreeData = [...state.treeData];

              // Update tree at original position
              if (oldTree.length > 0) {
                const oldParentId = treeUtils.findParentKey(state.treeData, id);
                if (oldParentId) {
                  // If has parent node, update parent's children
                  newTreeData = treeUtils.updateTreeNodes(newTreeData, oldParentId, (node) => ({
                    ...node,
                    children: treeUtils.mergeTreeData(node.children || [], oldTree.map(treeUtils.convertToTreeNode)),
                  }));
                } else {
                  // If direct child of root, update root level data
                  newTreeData = treeUtils.mergeTreeData(
                    newTreeData.filter((node) => node.key !== id), // Remove moved node
                    oldTree.map(treeUtils.convertToTreeNode),
                  );
                }
              } else {
                // parentId's children is empty, empty children array
                newTreeData = treeUtils.updateTreeNodes(newTreeData, parentId, (node) => ({
                  ...node,
                  children: [],
                }));
              }

              // Update tree at new position
              if (newTree.length > 0) {
                const targetNode = treeUtils.findNode(newTreeData, targetId);
                if (!targetNode) return { treeData: newTreeData };

                if (dropPosition === 0 && !targetNode.isLeaf) {
                  // Move into folder
                  newTreeData = treeUtils.updateTreeNodes(newTreeData, targetId, (node) => ({
                    ...node,
                    children: treeUtils.mergeTreeData(node.children || [], newTree.map(treeUtils.convertToTreeNode)),
                  }));
                } else {
                  // Move to same level
                  const newParentId = treeUtils.findParentKey(newTreeData, targetId);
                  if (newParentId) {
                    // Has parent node, update parent's children
                    newTreeData = treeUtils.updateTreeNodes(newTreeData, newParentId, (node) => ({
                      ...node,
                      children: treeUtils.mergeTreeData(node.children || [], newTree.map(treeUtils.convertToTreeNode)),
                    }));
                  } else {
                    // Root level, update root level data
                    newTreeData = treeUtils.mergeTreeData(newTreeData, newTree.map(treeUtils.convertToTreeNode));
                  }
                }
              }

              return { treeData: newTreeData };
            });
          } else {
            // Move within same level
            set((state) => ({
              treeData: treeUtils.mergeTreeData(state.treeData, result.map(treeUtils.convertToTreeNode)),
            }));
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

export const useDocumentStore = createSelectors(store);

export const useCurrentDocument = (): { currentDocument: DocTreeDataNode | null } => {
  const curId = useDocumentStore.getState().selectedKeys[0];
  if (!curId) return { currentDocument: null };
  const currentDocument = treeUtils.findNode(useDocumentStore.getState().treeData, curId);
  return { currentDocument };
};

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
