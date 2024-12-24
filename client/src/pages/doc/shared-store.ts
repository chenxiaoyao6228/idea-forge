import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { CommonSharedDocumentResponse } from "shared";
import { TreeDataNode } from "@/components/ui/tree";
import { documentApi } from "@/apis/document";
import createSelectors from "@/stores/utils/createSelector";

interface SharedDocTreeDataNode extends TreeDataNode {
  content?: string;
}

interface SharedStoreState {
  sharedTreeData: SharedDocTreeDataNode[];
  expandedKeys: string[];
  selectedKeys: string[];

  // Actions
  loadSharedDocuments: () => Promise<void>;
  setExpandedKeys: (keys: string[]) => void;
  setSelectedKeys: (keys: string[]) => void;
}

const store = create<SharedStoreState>()(
  devtools((set, get) => ({
    sharedTreeData: [],
    expandedKeys: [],
    selectedKeys: [],

    setExpandedKeys: (keys) => set({ expandedKeys: keys }),
    setSelectedKeys: (keys) => {
      set({ selectedKeys: keys });
    },

    loadSharedDocuments: async () => {
      const response = await documentApi.getSharedDocuments();

      const treeData = response.reduce((acc: SharedDocTreeDataNode[], doc) => {
        const authorName = doc.owner.displayName || doc.owner.email;
        const authorNode = acc.find((node) => node.title === authorName);

        const docNode: SharedDocTreeDataNode = {
          key: doc.id,
          title: doc.title,
          isLeaf: true,
          children: [],
        };

        if (authorNode) {
          authorNode.children?.push(docNode);
        } else {
          acc.push({
            key: authorName,
            title: authorName,
            isLeaf: false,
            children: [docNode],
          });
        }

        return acc;
      }, []);

      set({ sharedTreeData: treeData });
    },
  })),
);

export const useSharedDocumentStore = createSelectors(store);
