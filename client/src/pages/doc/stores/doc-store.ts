import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { TreeDataNode } from "@/components/ui/tree";
import { documentApi } from "@/apis/document";
import { DuplicateDocumentResponse, MoveDocumentsDto, UpdateDocumentDto } from "shared";
import createSelectors from "@/stores/utils/createSelector";
import { treeUtils } from "../util";
import { PRESET_CATEGORIES } from "../modules/detail/constants";

export interface DocTreeDataNode extends TreeDataNode {
  content?: string;
  coverImage?: {
    url?: string;
    scrollY?: number;
  };
  permission?: "NONE" | "EDIT" | "READ";
  ownerId?: number;
}

interface DocumentTreeState {
  expandedKeys: string[];
  loading: boolean;
  treeData: DocTreeDataNode[];
  lastDocId: string | null;
  currentDocId: string | null;
  currentDocument: DocTreeDataNode | null;
  currentDocLoadingError: string | null;
  isCurrentDocLoading: boolean;

  // actions
  setExpandedKeys: (keys: string[]) => void;
  setSelectedKeys: (keys: string[]) => void;
  setCurrentDocument: (doc: DocTreeDataNode) => void;
  loadChildren: (key: string | null) => Promise<void>;
  createDocument: (parentId: string | null, title: string) => Promise<string>;
  deleteDocument: (id: string) => Promise<string | null>;
  moveDocuments: (data: MoveDocumentsDto) => Promise<void>;
  loadNestedTree: (key: string | null) => Promise<void>;
  updateDocument: (id: string, update: UpdateDocumentDto) => Promise<void>;
  duplicateDocument: (id: string) => Promise<DuplicateDocumentResponse>;
  setLastDocId: (id: string) => void;
  generateDefaultCover: (id: string) => Promise<void>;
  updateCover: (id: string, dto: { url?: string; scrollY?: number }) => Promise<void>;
  removeCover: (id: string) => Promise<void>;
  setCurrentDocId: (id: string | null) => void;
  fetchCurrentDocument: (id: string) => Promise<void>;
}

const store = create<DocumentTreeState>()(
  devtools(
    (set, get) => ({
      expandedKeys: [],
      treeData: [],
      loading: false,
      lastDocId: null,
      currentDocId: null,
      currentDocument: null,
      currentDocLoadingError: null,
      isCurrentDocLoading: false,

      setExpandedKeys: (keys) => set({ expandedKeys: keys }),

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
            };
          }

          return {
            treeData: treeUtils.updateTreeNodes(state.treeData, parentId, (node) => ({
              ...node,
              children: [...(node.children || []), newNode],
              isLeaf: false,
            })),
            expandedKeys: newExpandedKeys,
          };
        });

        return response.id;
      },

      deleteDocument: async (id) => {
        // Find parent before deletion to determine navigation target
        const parentKey = treeUtils.findParentKey(get().treeData, id);

        // Remove document from tree and update state
        const updatedTree = treeUtils.removeTreeNode(get().treeData, id);
        set({ treeData: updatedTree });

        await documentApi.delete(id);

        // If document had a parent, refresh parent's children and navigate to parent
        if (parentKey) {
          const fetchedChildren = await documentApi.getChildren(parentKey);
          const newExpandedKeys =
            fetchedChildren.length > 0 ? [...new Set([...get().expandedKeys, parentKey])] : get().expandedKeys.filter((key) => key !== parentKey);

          // Update parent node with fresh children data
          set((state) => ({
            treeData: treeUtils.updateTreeNodes(state.treeData, parentKey, (node) => ({
              ...node,
              children: treeUtils.mergeTreeData(node.children || [], fetchedChildren.map(treeUtils.convertToTreeNode)),
              expandedKeys: newExpandedKeys,
              isLeaf: fetchedChildren.length === 0,
            })),
          }));

          return parentKey;
        }

        // Handle root level document deletion
        const remainingSiblings = parentKey ? treeUtils.findNode(updatedTree, parentKey)?.children || [] : updatedTree;

        // If there are remaining documents, navigate to first sibling
        if (remainingSiblings.length > 0) {
          return remainingSiblings[0].key;
        }

        // If no documents remain, create a new empty document
        const newDoc = await documentApi.create({
          title: "Untitled",
          content: "",
          parentId: null,
        });
        const newNode = treeUtils.convertToTreeNode(newDoc);

        set({ treeData: [...updatedTree, newNode] });

        return newNode.key;
      },

      updateDocument: async (id, update) => {
        try {
          set({ loading: true });
          await documentApi.update(id, update);

          set((state) => {
            const node = treeUtils.findNode(state.treeData, id);
            if (!node) return state;

            const updates = {
              ...node,
              ...update,
            };

            return {
              treeData: treeUtils.updateTreeNodes(state.treeData, id, () => updates),
              currentDocument: state.currentDocId === id ? updates : state.currentDocument,
            };
          });
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
            set((state) => {
              const parentId = treeUtils.findParentKey(state.treeData, id);
              if (parentId) {
                // If has parent, update parent's children
                return {
                  treeData: treeUtils.updateTreeNodes(state.treeData, parentId, (node) => ({
                    ...node,
                    children: treeUtils.mergeTreeData(node.children || [], result.map(treeUtils.convertToTreeNode)),
                  })),
                };
              }
              // If at root level
              return {
                treeData: treeUtils.mergeTreeData(
                  state.treeData.filter((node) => !result.some((r: any) => r.id === node.key)),
                  result.map(treeUtils.convertToTreeNode),
                ),
              };
            });
          }

          // After successful move, if the moved document was current, refresh it
          const currentDocId = get().currentDocId;
          if (currentDocId === id) {
            await get().fetchCurrentDocument(id);
          }
        } catch (error) {
          console.error("Failed to move documents:", error);
          throw error;
        }
      },

      duplicateDocument: async (id) => {
        try {
          const response = await documentApi.duplicate(id);

          const newNode = treeUtils.convertToTreeNode(response);

          set((state) => {
            const parentId = treeUtils.findParentKey(state.treeData, id);
            const newExpandedKeys = parentId ? [...new Set([...state.expandedKeys, parentId])] : state.expandedKeys;

            if (!parentId) {
              return {
                treeData: [...state.treeData, newNode],
                expandedKeys: newExpandedKeys,
              };
            }

            return {
              treeData: treeUtils.updateTreeNodes(state.treeData, parentId, (node) => ({
                ...node,
                children: [...(node.children || []), newNode],
                isLeaf: false,
              })),
              expandedKeys: newExpandedKeys,
            };
          });

          return response.id;
        } catch (error) {
          console.error("Failed to duplicate document:", error);
          throw error;
        }
      },

      setLastDocId: (id) => {
        set({ lastDocId: id });
      },

      generateDefaultCover: async (id) => {
        try {
          const allPresetCovers = PRESET_CATEGORIES.flatMap((category) => category.items);
          const randomCover = allPresetCovers[Math.floor(Math.random() * allPresetCovers.length)];

          if (!randomCover) throw new Error("No preset covers available");

          const response = await documentApi.updateCover(id, {
            url: randomCover.url,
            scrollY: 50,
            isPreset: true,
          });

          set((state) => {
            const node = treeUtils.findNode(state.treeData, id);
            if (!node) return state;

            const coverUpdate = {
              ...node,
              coverImage: {
                id: response.id,
                url: randomCover.url,
                scrollY: 50,
                isPreset: true,
              },
            };

            return {
              treeData: treeUtils.updateTreeNodes(state.treeData, id, () => coverUpdate),
              currentDocument: state.currentDocId === id ? coverUpdate : state.currentDocument,
            };
          });

          return response;
        } catch (error) {
          console.error("Failed to generate default cover:", error);
          throw error;
        }
      },

      updateCover: async (id, dto) => {
        try {
          const response = await documentApi.updateCover(id, dto);

          set((state) => {
            const coverUpdate = {
              coverImage: {
                ...state.currentDocument?.coverImage,
                ...dto,
              },
            };

            return {
              treeData: treeUtils.updateTreeNodes(state.treeData, id, (node) => ({
                ...node,
                ...coverUpdate,
              })),
              currentDocument: state.currentDocId === id ? { ...state.currentDocument!, ...coverUpdate } : state.currentDocument,
            };
          });

          return response;
        } catch (error) {
          console.error("Failed to update cover:", error);
          throw error;
        }
      },

      removeCover: async (id) => {
        try {
          await documentApi.removeCover(id);

          set((state) => ({
            treeData: treeUtils.updateTreeNodes(state.treeData, id, (node) => ({
              ...node,
              coverImage: undefined,
            })),
            currentDocument: state.currentDocId === id ? { ...state.currentDocument!, coverImage: undefined } : state.currentDocument,
          }));
        } catch (error) {
          console.error("Failed to remove cover:", error);
          throw error;
        }
      },

      setCurrentDocId: (id) => {
        set({ currentDocId: id });
        if (id) get().fetchCurrentDocument(id);
      },

      fetchCurrentDocument: async (id) => {
        set({ isCurrentDocLoading: true });
        try {
          const doc = await documentApi.getDocument(id);
          set((state) => ({
            currentDocument: {
              ...doc,
              key: id,
              coverImage: doc.coverImage ? { ...doc.coverImage } : undefined,
            },
            treeData: treeUtils.updateTreeNodes(state.treeData, id, (node) => ({
              ...node,
              ...doc,
              key: id,
              coverImage: doc.coverImage ? { ...doc.coverImage } : node.coverImage,
            })),
            isCurrentDocLoading: false,
            currentDocLoadingError: null,
          }));
        } catch (error: any) {
          if (error.status === 404) {
            console.error("Failed to fetch document:", error);
            set({ isCurrentDocLoading: false, currentDocument: null, currentDocLoadingError: "You are not authorized to access this document" });
          }
          set({ isCurrentDocLoading: false });
        }
      },
    }),
    { name: "document-tree-store" },
  ),
);

export const useDocumentStore = createSelectors(store);
