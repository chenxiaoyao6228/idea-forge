import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { CommonSharedDocumentResponse, DocShareUser, Permission, ShareDocumentDto } from "contracts";
import { TreeDataNode } from "@/components/ui/tree";
import { documentApi } from "@/apis/document";
import createSelectors from "@/stores/utils/create-selectors";

interface SharedDocTreeDataNode extends TreeDataNode {
  content?: string;
  coverImage?: {
    url?: string;
    scrollY?: number;
  };
}

interface SharedStoreState {
  sharedDocList: CommonSharedDocumentResponse[];
  sharedTreeData: SharedDocTreeDataNode[];
  expandedKeys: string[];
  selectedKeys: string[];
  loadSharedDocuments: () => Promise<void>;
  getCurrentSharedDoc: (docId: string) => SharedDocTreeDataNode | null;
  setSharedDocList: (list: CommonSharedDocumentResponse[]) => void;
  setExpandedKeys: (keys: string[]) => void;
  setSelectedKeys: (keys: string[]) => void;

  // doc shares
  currentDocShares: DocShareUser[];
  loadDocShares: (docId: string) => Promise<void>;
  shareDocument: (data: ShareDocumentDto) => Promise<void>;
  removeShare: (docId: string, userId: number) => Promise<void>;
  updateSharePermission: (docId: string, userId: number, permission: Permission) => Promise<void>;
}

const store = create<SharedStoreState>()(
  devtools((set, get) => ({
    sharedTreeData: [],
    sharedDocList: [],
    setSharedDocList: (list) => set({ sharedDocList: list }),
    expandedKeys: [],
    selectedKeys: [],
    setExpandedKeys: (keys) => set({ expandedKeys: keys }),
    setSelectedKeys: (keys) => {
      set({ selectedKeys: keys });
    },

    getCurrentSharedDoc: (docId: string) => {
      return get().sharedDocList.find((doc) => doc.id === docId) || null;
    },

    loadSharedDocuments: async () => {
      const response = await documentApi.getSharedDocuments();

      const treeData = response.reduce((acc: SharedDocTreeDataNode[], doc) => {
        const authorName = doc.owner.displayName || doc.owner.email;
        const authorNode = acc.find((node) => node.title === authorName);

        const docNode: SharedDocTreeDataNode = {
          id: doc.id,
          key: doc.id,
          title: doc.title,
          coverImage: doc.coverImage || undefined,
          isLeaf: true,
          children: [],
        };

        if (authorNode) {
          authorNode.children?.push(docNode);
        } else {
          acc.push({
            id: doc.id,
            key: authorName,
            title: authorName,
            coverImage: doc.coverImage || undefined,
            isLeaf: false,
            children: [docNode],
          });
        }

        return acc;
      }, []);

      set({ sharedTreeData: treeData, sharedDocList: response });
    },

    // doc shares
    currentDocShares: [],
    loadDocShares: async (docId) => {
      const shares = await documentApi.getDocShares(docId);
      set({ currentDocShares: shares });
    },

    shareDocument: async (data) => {
      const shares = await documentApi.shareDocument(data);
      set({ currentDocShares: shares });
    },

    removeShare: async (docId, userId) => {
      await documentApi.removeShare(docId, { targetUserId: userId });
      const updatedShares = get().currentDocShares.filter((share) => share.id !== userId);
      set({ currentDocShares: updatedShares });
    },

    updateSharePermission: async (docId, userId, permission) => {
      const shares = await documentApi.updateSharePermission(docId, { userId, permission });
      set({ currentDocShares: shares });
    },
  })),
);

export const useSharedDocumentStore = createSelectors(store);
