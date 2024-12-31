import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { TreeDataNode } from "@/components/ui/tree";
import { documentApi } from "@/apis/document";
import { CommonDocumentResponse, MoveDocumentsDto, UpdateDocumentDto } from "shared";
import createSelectors from "@/stores/utils/createSelector";
import { treeUtils } from "./util";
import { PRESET_CATEGORIES } from "./modules/detail/constants";

const LAST_DOC_ID_KEY = "lastDocId";

export interface DocTreeDataNode extends TreeDataNode {
  id?: string;
  content?: string;
}

interface DocumentTreeState {
  expandedKeys: string[];
  selectedKeys: string[];
  loading: boolean;
  treeData: DocTreeDataNode[];
  lastDocId: string | null;

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
  setLastDocId: (id: string) => void;
  generateDefaultCover: (id: string) => Promise<void>;
  updateCover: (id: string, dto: { fileId?: string; scrollY?: number }) => Promise<void>;
  removeCover: (id: string) => Promise<void>;
}

const store = create<DocumentTreeState>()(
  devtools(
    (set, get) => ({
      expandedKeys: [],
      selectedKeys: [],
      treeData: [],
      loading: false,
      lastDocId: localStorage.getItem(LAST_DOC_ID_KEY),

      setExpandedKeys: (keys) => set({ expandedKeys: keys }),

      setSelectedKeys: (keys) => {
        set({ selectedKeys: keys });
        if (keys.length > 0) {
          get().setLastDocId(keys[0]);
        }
      },

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

      setLastDocId: (id) => {
        localStorage.setItem(LAST_DOC_ID_KEY, id);
        set({ lastDocId: id });
      },

      generateDefaultCover: async (id) => {
        try {
          // 1. 从 PRESET_CATEGORIES 中随机选择一个封面
          const allPresetCovers = PRESET_CATEGORIES.flatMap((category) => category.items);
          const randomCover = allPresetCovers[Math.floor(Math.random() * allPresetCovers.length)];

          if (!randomCover) {
            throw new Error("No preset covers available");
          }

          // 2. 使用 updateCover 接口更新封面
          const response = await documentApi.updateCover(id, {
            url: randomCover.url,
            scrollY: 0,
            isPreset: true,
          });

          // 3. 更新当前文档的封面信息
          set((state) => ({
            treeData: treeUtils.updateTreeNodes(state.treeData, id, (node) => ({
              ...node,
              coverImage: {
                url: randomCover.url,
                scrollY: 0,
                isPreset: true,
              },
            })),
          }));

          return response;
        } catch (error) {
          console.error("Failed to generate default cover:", error);
          throw error;
        }
      },

      updateCover: async (id, dto) => {
        try {
          const response = await documentApi.updateCover(id, dto);

          // Update store after API call succeeds
          set((state) => ({
            treeData: treeUtils.updateTreeNodes(state.treeData, id, (node) => ({
              ...node,
              coverImage: dto,
            })),
          }));

          return response;
        } catch (error) {
          console.error("Failed to update cover:", error);
          throw error;
        }
      },

      removeCover: async (id) => {
        try {
          const response = await documentApi.removeCover(id);

          // Update store after API call succeeds
          set((state) => ({
            treeData: treeUtils.updateTreeNodes(state.treeData, id, (node) => ({
              ...node,
              coverImage: null,
            })),
          }));

          return response;
        } catch (error) {
          console.error("Failed to remove cover:", error);
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
  const currentDocument = treeUtils.findNode(useDocumentStore.getState().treeData, curId) as DocTreeDataNode;
  return { currentDocument };
};
