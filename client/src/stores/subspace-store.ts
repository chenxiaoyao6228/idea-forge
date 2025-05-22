import { documentApi } from "@/apis/document";
import { createStore } from "./utils/factory";
import { CommonDocumentResponse, DocTypeSchema, DocVisibilitySchema, Subspace } from "contracts";
import useWorkspaceStore from "./workspace-store";
import { produce } from "immer";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type NavigationNode = CommonDocumentResponse & {
  children: NavigationNode[];
  key: CommonDocumentResponse["id"];
  isLeaf: boolean;
};

export interface SubspaceState {
  id: Subspace["id"];
  name: Subspace["name"];
  avatar: Subspace["avatar"];
  workspaceId: Subspace["workspaceId"];
  documentsMap: Record<string, CommonDocumentResponse>;
  navigationTree: NavigationNode[];
  expandedKeys: string[];
}

interface State {
  subspaces: Record<string, SubspaceState>;
}

interface Action {
  setSubspaces: (subspaces: Subspace[]) => void;
  createDocument: (params: { title: string; parentId: string | null; subspaceId: string }) => Promise<void>;
  addToMap: (subspaceId: string, document: CommonDocumentResponse[]) => void;
  buildNavigationTree: (subspaceId: string) => void;
  getAllList: (subspaceId: string) => CommonDocumentResponse[];
  fetchChildDocuments: (documentId: string | null, workspaceId: string) => Promise<void>;
  setExpandedKeys: (subspaceId: string, expandedKeys: string[]) => void;
}

type ComputedState = {};

const defaultState: State = {
  subspaces: {},
};

const useSubSpaceStore = createStore<State & Action, ComputedState>(
  (set, get) => ({
    ...defaultState,
    setSubspaces: (subspaces) => {
      set(
        produce((state) => {
          subspaces.forEach((subspace) => {
            state.subspaces[subspace.id] = {
              id: subspace.id,
              name: subspace.name,
              avatar: subspace.avatar,
              workspaceId: subspace.workspaceId,
              documentsMap: {},
              navigationTree: [],
              expandedKeys: [],
            };
          });
        }),
      );
    },
    createDocument: async ({ parentId, title, subspaceId }) => {
      // await sleep(1000);
      const response = (await documentApi.create({
        workspaceId: useWorkspaceStore.getState().currentWorkspace?.id!,
        subspaceId,
        visibility: subspaceId ? DocVisibilitySchema.Enum.WORKSPACE : DocVisibilitySchema.Enum.PRIVATE,
        parentId: parentId || null,
        type: DocTypeSchema.Enum.NOTE,
        title,
        content: "",
      })) as any;

      if (parentId) {
        set(
          produce((state) => {
            state.subspaces[subspaceId].documentsMap[parentId].isLeaf = false;
          }),
        );
      }

      get().addToMap(subspaceId, [response]);
      get().buildNavigationTree(subspaceId);

      return response.id;
    },
    addToMap: (subspaceId, documents) => {
      set(
        produce((state) => {
          const subspace = state.subspaces[subspaceId];
          if (!subspace) return;

          for (const doc of documents) {
            subspace.documentsMap[doc.id] = doc;
          }
        }),
      );
    },
    buildNavigationTree: (subspaceId) => {
      const documents = get().getAllList(subspaceId);
      const buildTree = (parentId: string | null): NavigationNode[] => {
        return documents
          .filter((doc) => doc.parentId === parentId)
          .map((doc) => ({
            ...doc,
            key: doc.id,
            children: buildTree(doc.id),
          }));
      };

      const builtTree = buildTree(null);
      set(
        produce((state) => {
          state.subspaces[subspaceId].navigationTree = builtTree;
        }),
      );
    },
    getAllList: (subspaceId) => Object.values(get().subspaces[subspaceId].documentsMap).filter((d) => !d.isArchived),
    fetchChildDocuments: async (documentId, subspaceId) => {
      const response = await documentApi.list({
        parentId: documentId || null,
        page: 1,
        limit: 1000,
        visibility: "WORKSPACE", //TODO: fix this, might need to remove this
        workspaceId: useWorkspaceStore.getState().currentWorkspace?.id || "",
        sortBy: "updatedAt",
        sortOrder: "desc",
        subspaceId: subspaceId || null,
      });
      get().addToMap(subspaceId, response.data);
      get().buildNavigationTree(subspaceId);
    },
    setExpandedKeys: (subspaceId, expandedKeys) => {
      set(
        produce((state) => {
          state.subspaces[subspaceId].expandedKeys = expandedKeys;
        }),
      );
    },
  }),
  (state) => ({}),
  {
    devtoolOptions: {
      name: "subspaceStore",
    },
  },
);

export const useSubspace = (subspaceId: string) => {
  const subspace = useSubSpaceStore.getState().subspaces[subspaceId];
  return {
    ...subspace,
    getAllList: () => useSubSpaceStore.getState().getAllList(subspaceId),
    fetchChildDocuments: (documentId: string | null) => useSubSpaceStore.getState().fetchChildDocuments(documentId, subspaceId),
    createDocument: (title: string, parentId: string | null) => useSubSpaceStore.getState().createDocument({ title, parentId, subspaceId }),
    buildNavigationTree: () => useSubSpaceStore.getState().buildNavigationTree(subspaceId),
    addToMap: (documents: CommonDocumentResponse[]) => useSubSpaceStore.getState().addToMap(subspaceId, documents),
    setExpandedKeys: (expandedKeys: string[]) => useSubSpaceStore.getState().setExpandedKeys(subspaceId, expandedKeys),
  };
};

export default useSubSpaceStore;
