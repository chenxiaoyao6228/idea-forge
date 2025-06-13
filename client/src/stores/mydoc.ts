// import { create } from "zustand";
// import { devtools, subscribeWithSelector } from "zustand/middleware";
// import { createComputed } from "zustand-computed";
// import { NavigationNode, NavigationNodeType } from "contracts";
// import { documentApi } from "@/apis/document";
// import { produce } from "immer";
// import createEntitySlice, { EntityState, EntityActions } from "./utils/entity-slice";
// import { DocumentEntity } from "./document";
// import useWorkspaceStore from "./workspace";

// export interface MyDocsEntity {
//   id: string; // Use userId as unique identifier
//   userId: string;
//   navigationTree: NavigationNode[];
//   updatedAt: Date;
//   createdAt: Date;
// }

// interface State {
//   isLoading: boolean;
//   isLoaded: boolean;
//   activeUserId?: string;
// }

// interface Action {
//   // API actions
//   fetchMyDocsTree: (options?: { force?: boolean }) => Promise<void>;

//   // Document tree management
//   addDocument: (document: DocumentEntity) => void;
//   updateDocument: (documentId: string, updates: Partial<DocumentEntity>) => void;
//   removeDocument: (documentId: string) => void;

//   // Navigation helpers
//   getPathToDocument: (documentId: string) => NavigationNode[];
//   containsDocument: (documentId: string) => boolean;
//   getExpandedKeysForDocument: (documentId: string) => string[];

//   // Utility methods
//   needsUpdate: (updatedAt: Date) => boolean;
//   refreshMyDocsTree: () => Promise<void>;
// }

// const defaultState: State = {
//   isLoading: false,
//   isLoaded: false,
//   activeUserId: undefined,
// };

// const myDocsEntitySlice = createEntitySlice<MyDocsEntity>();
// export const myDocsSelectors = myDocsEntitySlice.selectors;

// type StoreState = State & Action & EntityState<MyDocsEntity> & EntityActions<MyDocsEntity>;

// const useMyDocsStore = create<StoreState>()(
//   subscribeWithSelector(
//     devtools(
//       createComputed((state: StoreState) => ({
//         myDocsTree: state.activeUserId ? state.entities[state.activeUserId]?.navigationTree || [] : [],
//         hasDocuments: state.activeUserId ? (state.entities[state.activeUserId]?.navigationTree?.length || 0) > 0 : false,
//       }))((set, get) => ({
//         ...defaultState,
//         ...myDocsEntitySlice.initialState,
//         ...myDocsEntitySlice.createActions(set),

//         // Initialize with current user
//         setActiveUser: (userId: string) => {
//           set({ activeUserId: userId });
//           if (!get().entities[userId]) {
//             get().addOne({
//               id: userId,
//               userId,
//               navigationTree: [],
//               updatedAt: new Date(),
//               createdAt: new Date(),
//             });
//           }
//         },

//         fetchMyDocsTree: async (options = {}) => {
//           const { activeUserId, entities } = get();
//           if (!activeUserId) return;

//           const myDocs = entities[activeUserId];
//           if (myDocs?.navigationTree?.length > 0 && !options?.force) return;

//           set({ isLoading: true });
//           try {
//             // Use the mydocs API we defined earlier
//             const response = await documentApi.getMyDocsTree();

//             get().updateOne({
//               id: activeUserId,
//               changes: {
//                 navigationTree: response.data || [],
//                 updatedAt: new Date(),
//               },
//             });

//             set({ isLoaded: true });
//           } catch (error) {
//             console.error("Failed to fetch mydocs tree:", error);
//           } finally {
//             set({ isLoading: false });
//           }
//         },

//         addDocument: (document) => {
//           const { activeUserId } = get();
//           if (!activeUserId) return;

//           try {
//             const navigationNode: NavigationNode = {
//               type: NavigationNodeType.Document,
//               id: document.id,
//               title: document.title,
//               url: `/${document.id}`,
//               icon: document.icon,
//               parent: null,
//               children: [],
//               subspaceId: null, // Important: mydocs have null subspaceId
//             };

//             set(
//               produce((state) => {
//                 const myDocs = state.entities[activeUserId];
//                 if (!myDocs) return;

//                 if (document.parentId) {
//                   const findAndAddToParent = (nodes: NavigationNode[]): boolean => {
//                     for (const node of nodes) {
//                       if (node.id === document.parentId) {
//                         node.children = [navigationNode, ...(node.children || [])];
//                         navigationNode.parent = node;
//                         return true;
//                       }
//                       if (node.children && findAndAddToParent(node.children)) {
//                         return true;
//                       }
//                     }
//                     return false;
//                   };

//                   if (!myDocs.navigationTree) {
//                     myDocs.navigationTree = [];
//                   }
//                   findAndAddToParent(myDocs.navigationTree);
//                 } else {
//                   myDocs.navigationTree = [navigationNode, ...(myDocs.navigationTree || [])];
//                 }
//               }),
//             );
//           } catch (error) {
//             console.error("Failed to add document to mydocs:", error);
//             throw error;
//           }
//         },

//         updateDocument: (documentId, updates) => {
//           const { activeUserId } = get();
//           if (!activeUserId) return;

//           set(
//             produce((state) => {
//               const myDocs = state.entities[activeUserId];
//               if (!myDocs?.navigationTree) return;

//               const updateNodeInTree = (nodes: NavigationNode[]): boolean => {
//                 for (const node of nodes) {
//                   if (node.id === documentId) {
//                     node.title = updates.title || node.title;
//                     return true;
//                   }
//                   if (node.children && updateNodeInTree(node.children)) {
//                     return true;
//                   }
//                 }
//                 return false;
//               };

//               updateNodeInTree(myDocs.navigationTree);
//             }),
//           );
//         },

//         removeDocument: (documentId) => {
//           const { activeUserId } = get();
//           if (!activeUserId) return;

//           set(
//             produce((state) => {
//               const myDocs = state.entities[activeUserId];
//               if (!myDocs?.navigationTree) return;

//               const removeFromTree = (nodes: NavigationNode[]): boolean => {
//                 for (let i = 0; i < nodes.length; i++) {
//                   const node = nodes[i];
//                   if (node.id === documentId) {
//                     nodes.splice(i, 1);
//                     return true;
//                   }
//                   if (node.children && removeFromTree(node.children)) {
//                     return true;
//                   }
//                 }
//                 return false;
//               };

//               removeFromTree(myDocs.navigationTree);
//             }),
//           );
//         },

//         getPathToDocument: (documentId: string): NavigationNode[] => {
//           const { activeUserId } = get();
//           if (!activeUserId) return [];

//           const myDocs = get().entities[activeUserId];
//           if (!myDocs?.navigationTree) return [];

//           let path: NavigationNode[] = [];

//           const findPath = (nodes: NavigationNode[], targetId: string, currentPath: NavigationNode[]): boolean => {
//             for (const node of nodes) {
//               const newPath = [...currentPath, node];

//               if (node.id === targetId) {
//                 path = newPath;
//                 return true;
//               }

//               if (node.children && findPath(node.children, targetId, newPath)) {
//                 return true;
//               }
//             }
//             return false;
//           };

//           findPath(myDocs.navigationTree, documentId, []);
//           return path;
//         },

//         containsDocument: (documentId: string): boolean => {
//           const path = get().getPathToDocument(documentId);
//           return path.length > 0;
//         },

//         getExpandedKeysForDocument: (documentId: string): string[] => {
//           const path = get().getPathToDocument(documentId);
//           return path.slice(0, -1).map((node) => node.id);
//         },

//         needsUpdate: (updatedAt: Date) => {
//           const { activeUserId } = get();
//           if (!activeUserId) return true;

//           const existing = get().entities[activeUserId];
//           if (!existing) return true;

//           const existingDate = new Date(existing.updatedAt);
//           const newDate = new Date(updatedAt);
//           return existingDate.getTime() < newDate.getTime();
//         },

//         refreshMyDocsTree: async () => {
//           await get().fetchMyDocsTree({ force: true });
//         },
//       })),
//       { name: "myDocStore" },
//     ),
//   ),
// );

// export default useMyDocsStore;
