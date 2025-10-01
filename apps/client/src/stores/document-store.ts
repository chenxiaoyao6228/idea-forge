import { create } from "zustand";
import { useMemo } from "react";
import useRequest from "@ahooksjs/use-request";
import { CoverImage, DocTypeSchema, DocVisibilitySchema, PermissionLevel, SubspaceTypeSchema, SerializedAbilityMap } from "@idea/contracts";
import { NavigationNode, NavigationNodeType } from "@idea/contracts";
import { documentApi } from "@/apis/document";
import useSubSpaceStore, { usePersonalSubspace } from "./subspace-store";
import useWorkspaceStore from "./workspace-store";
import { useRefCallback } from "@/hooks/use-ref-callback";
import { useInitializeSubjectAbilities } from "@/stores/ability-store";
import { useParams } from "react-router-dom";

// Direct functions for subspace operations (can be called from within document store)
const addDocumentToSubspace = (subspaceId: string, document: DocumentEntity) => {
  const subspaces = useSubSpaceStore.getState().subspaces;
  const subspace = subspaces[subspaceId];
  if (!subspace) return;

  const navigationNode: NavigationNode = {
    id: document.id,
    title: document.title,
    type: NavigationNodeType.Document,
    url: "",
    children: [],
    parent: null,
  };

  useSubSpaceStore.setState((state) => {
    const newSubspace = { ...state.subspaces[subspaceId] };
    if (!newSubspace.navigationTree) {
      newSubspace.navigationTree = [];
    }

    if (document.parentId) {
      const findAndAddToParent = (nodes: NavigationNode[]): boolean => {
        for (const node of nodes) {
          if (node.id === document.parentId) {
            node.children = [navigationNode, ...(node.children || [])];
            navigationNode.parent = node;
            return true;
          }
          if (node.children && findAndAddToParent(node.children)) {
            return true;
          }
        }
        return false;
      };
      findAndAddToParent(newSubspace.navigationTree);
    } else {
      newSubspace.navigationTree = [navigationNode, ...newSubspace.navigationTree];
    }

    return {
      subspaces: {
        ...state.subspaces,
        [subspaceId]: newSubspace,
      },
    };
  });
};

const removeDocumentFromSubspace = (subspaceId: string, documentId: string) => {
  useSubSpaceStore.setState((state) => {
    const subspace = state.subspaces[subspaceId];
    if (!subspace?.navigationTree) return state;

    const newSubspace = { ...subspace };
    const newNavigationTree = [...newSubspace.navigationTree];

    const removeFromTree = (nodes: NavigationNode[]): boolean => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.id === documentId) {
          nodes.splice(i, 1);
          return true;
        }
        if (node.children && removeFromTree(node.children)) {
          return true;
        }
      }
      return false;
    };

    removeFromTree(newNavigationTree);
    newSubspace.navigationTree = newNavigationTree;

    return {
      subspaces: {
        ...state.subspaces,
        [subspaceId]: newSubspace,
      },
    };
  });
};

// Types
export interface DocumentEntity {
  id: string;
  title: string;
  content: string;
  workspaceId: string;
  subspaceId?: string | null;
  parentId?: string | null;
  type: string;
  visibility: string;
  coverImage?: CoverImage;
  publishedAt?: string | null;
  archivedAt?: string | null;
  deletedAt?: string | null;
  lastModifiedById?: string;
  createdById?: string;
  updatedAt: string;
  createdAt: string;
  permission?: PermissionLevel;
  [key: string]: any;
}

interface FetchOptions {
  force?: boolean;
  prefetch?: boolean;
  shareId?: string;
  silent?: boolean;
}

interface FetchDetailResult {
  doc: DocumentEntity;
  permissions?: SerializedAbilityMap | null;
}

interface CreateDocumentParams {
  title: string;
  parentId: string | null;
  subspaceId: string | null;
  workspaceId?: string;
}

interface MoveDocumentParams {
  id: string;
  subspaceId?: string | null;
  oldSubspaceId?: string | null;
  parentId?: string | null;
  index?: number;
}

interface FetchChildrenParams {
  parentId: string;
  subspaceId: string | null;
  sharedDocumentId?: string;
  options?: { force?: boolean };
}

// Minimal store
const useDocumentStore = create<{
  documents: Record<string, DocumentEntity>;
  activeDocumentId?: string;
  sharedCache: Record<string, { sharedTree: any; workspace: any }>;
  movingDocumentId: string | null;
}>((set) => ({
  documents: {},
  activeDocumentId: undefined,
  sharedCache: {},
  movingDocumentId: null,
}));

// Data access hooks
export const useDocuments = () => useDocumentStore((state) => state.documents);
export const useActiveDocumentId = () => useDocumentStore((state) => state.activeDocumentId);
export const useSharedCache = () => useDocumentStore((state) => state.sharedCache);
export const useMovingDocumentId = () => useDocumentStore((state) => state.movingDocumentId);

// CRUD operation hooks
export const useFetchDocumentDetail = () => {
  const initializeSubjectAbilities = useInitializeSubjectAbilities();

  return useRequest(
    async (id: string, options: FetchOptions = {}) => {
      try {
        const { doc, permissions } = (await documentApi.getDocument(id)) as FetchDetailResult;

        if (!doc) {
          throw new Error("Document not available");
        }

        // Update store with document payload (includes resolved permission)
        useDocumentStore.setState((state) => ({
          documents: { ...state.documents, [doc.id]: doc },
        }));

        if (permissions && Object.keys(permissions).length > 0) {
          initializeSubjectAbilities(permissions);
        }

        // Only set active states if not in silent mode
        if (!options.silent) {
          useDocumentStore.setState({ activeDocumentId: doc.id });
          if (doc.subspaceId) {
            useSubSpaceStore.setState({ activeSubspaceId: doc.subspaceId });
          }
        }

        return {
          document: doc,
          permissions,
        };
      } catch (error) {
        console.error("Failed to fetch document detail:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useFetchDocumentChildren = () => {
  return useRequest(
    async ({ parentId, subspaceId, sharedDocumentId, options = {} }: FetchChildrenParams) => {
      try {
        if (!options.force) {
          const existingDocs = useDocumentStore.getState().documents;
          const hasChildren = Object.values(existingDocs).some((doc) => doc.parentId === parentId);
          if (hasChildren) return;
        }

        const response = await documentApi.list({
          parentId: parentId,
          page: 1,
          limit: 100,
          sortBy: "updatedAt",
          sortOrder: "asc",
          subspaceId: subspaceId || undefined,
          archivedAt: undefined,
          sharedDocumentId,
        });

        if (response.data) {
          const documents = response.data.map((doc) => ({
            ...doc,
          })) as unknown as DocumentEntity[];

          useDocumentStore.setState((state) => {
            const newDocuments = { ...state.documents };
            documents.forEach((doc) => {
              newDocuments[doc.id] = doc;
            });
            return { documents: newDocuments };
          });
        }

        // Legacy ability store functionality removed - using CASL instead
        // if (response.permissions) {
        //   // Convert permissions to ability entities and update store directly
        //   const entities = Object.entries(response.permissions).map(([id, abilities]) => ({
        //     id,
        //     abilities: { ...{ read: false, update: false, delete: false, share: false, comment: false }, ...(abilities as Record<string, boolean>) },
        //   }));
        //   useAbilityStore.setState((state) => {
        //     const newAbilities = { ...state.abilities };
        //     entities.forEach((entity) => {
        //       newAbilities[entity.id] = entity;
        //     });
        //     return { abilities: newAbilities };
        //   });
        // }
      } catch (error) {
        console.error("Failed to fetch children:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useCreateDocument = () => {
  return useRequest(
    async ({ title, parentId, subspaceId }: CreateDocumentParams) => {
      try {
        const workspaceId = useWorkspaceStore.getState().currentWorkspace?.id;
        if (!workspaceId) throw new Error("No active workspace");

        const isPrivateSubspace = subspaceId ? useSubSpaceStore.getState().subspaces[subspaceId]?.type === SubspaceTypeSchema.enum.PERSONAL : false;

        const response = (await documentApi.create({
          workspaceId,
          subspaceId: subspaceId || null,
          visibility: isPrivateSubspace ? DocVisibilitySchema.enum.PRIVATE : DocVisibilitySchema.enum.WORKSPACE,
          parentId: parentId || null,
          type: DocTypeSchema.enum.NOTE,
          title,
          content: "",
        })) as any;

        useDocumentStore.setState((state) => ({
          documents: { ...state.documents, [response.id]: response },
        }));

        return response.id;
      } catch (error) {
        console.error("Failed to create document:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useMoveDocument = () => {
  return useRequest(
    async ({ id, subspaceId, parentId, index }: MoveDocumentParams) => {
      try {
        useDocumentStore.setState({ movingDocumentId: id });

        const res = await documentApi.moveDocument({
          id,
          subspaceId,
          parentId,
          index,
        });

        if (res.data) {
          useDocumentStore.setState((state) => {
            const newDocuments = { ...state.documents };
            res.data.forEach((doc: DocumentEntity) => {
              newDocuments[doc.id] = doc;
            });
            return { documents: newDocuments };
          });
        }

        // Legacy ability store functionality removed - using CASL instead
        // if (res.permissions) {
        //   // Convert permissions to ability entities and update store directly
        //   const entities = Object.entries(res.permissions).map(([id, abilities]) => ({
        //     id,
        //     abilities: { ...{ read: false, update: false, delete: false, share: false, comment: false }, ...(abilities as Record<string, boolean>) },
        //   }));
        //   useAbilityStore.setState((state) => {
        //     const newAbilities = { ...state.abilities };
        //     entities.forEach((entity) => {
        //       newAbilities[entity.id] = entity;
        //     });
        //     return { abilities: newAbilities };
        //   });
        // }
      } catch (error) {
        console.error("Failed to move document:", error);
        throw error;
      } finally {
        useDocumentStore.setState({ movingDocumentId: null });
      }
    },
    { manual: true },
  );
};

export const usePublishDocument = () => {
  return useRequest(
    async (documentId: string, subspaceId: string, options: { user?: any } = {}) => {
      try {
        const documents = useDocumentStore.getState().documents;
        const doc = documents[documentId];
        if (!doc) throw new Error("Document not found");

        // Update document
        useDocumentStore.setState((state) => ({
          documents: {
            ...state.documents,
            [documentId]: {
              ...state.documents[documentId],
              publishedAt: new Date().toISOString(),
              subspaceId,
              lastModifiedById: options.user?.id || doc.lastModifiedById,
              updatedAt: new Date().toISOString(),
            },
          },
        }));

        // Add to subspace structure
        addDocumentToSubspace(subspaceId, doc);
      } catch (error) {
        console.error("Failed to publish document:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useUnpublishDocument = () => {
  return useRequest(
    async (documentId: string, options: { detach?: boolean; user?: any } = {}) => {
      try {
        const documents = useDocumentStore.getState().documents;
        const doc = documents[documentId];
        if (!doc) throw new Error("Document not found");

        // Remove from subspace structure
        if (doc.subspaceId) {
          removeDocumentFromSubspace(doc.subspaceId, documentId);
        }

        // Update document
        useDocumentStore.setState((state) => ({
          documents: {
            ...state.documents,
            [documentId]: {
              ...state.documents[documentId],
              publishedAt: null,
              subspaceId: options.detach ? null : doc.subspaceId,
              lastModifiedById: options.user?.id || doc.lastModifiedById,
              updatedAt: new Date().toISOString(),
            },
          },
        }));
      } catch (error) {
        console.error("Failed to unpublish document:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useArchiveDocument = () => {
  return useRequest(
    async (documentId: string, options: { user?: any } = {}) => {
      try {
        const documents = useDocumentStore.getState().documents;
        const doc = documents[documentId];
        if (!doc) throw new Error("Document not found");

        // Remove from subspace structure
        if (doc.subspaceId) {
          removeDocumentFromSubspace(doc.subspaceId, documentId);
        }

        // Archive document and all children
        const findAllChildDocumentIds = useFindAllChildDocumentIds();
        const childIds = findAllChildDocumentIds(documentId);
        const allIds = [documentId, ...childIds];

        useDocumentStore.setState((state) => {
          const newDocuments = { ...state.documents };
          allIds.forEach((id) => {
            if (newDocuments[id]) {
              newDocuments[id] = {
                ...newDocuments[id],
                archivedAt: new Date().toISOString(),
                lastModifiedById: options.user?.id || doc.lastModifiedById,
                updatedAt: new Date().toISOString(),
              };
            }
          });
          return { documents: newDocuments };
        });
      } catch (error) {
        console.error("Failed to archive document:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useRestoreDocument = () => {
  return useRequest(
    async (documentId: string, subspaceId: string, options: { user?: any } = {}) => {
      try {
        const documents = useDocumentStore.getState().documents;
        const doc = documents[documentId];
        if (!doc) throw new Error("Document not found");

        // Restore document and all children
        const findAllChildDocumentIds = useFindAllChildDocumentIds();
        const childIds = findAllChildDocumentIds(documentId);
        const allIds = [documentId, ...childIds];

        useDocumentStore.setState((state) => {
          const newDocuments = { ...state.documents };
          allIds.forEach((id) => {
            if (newDocuments[id]) {
              newDocuments[id] = {
                ...newDocuments[id],
                archivedAt: null,
                subspaceId,
                lastModifiedById: options.user?.id || doc.lastModifiedById,
                updatedAt: new Date().toISOString(),
              };
            }
          });
          return { documents: newDocuments };
        });

        // Add back to subspace structure if published
        if (doc.publishedAt) {
          addDocumentToSubspace(subspaceId, doc);
        }
      } catch (error) {
        console.error("Failed to restore document:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useDeleteDocument = () => {
  return useRequest(
    async (documentId: string, options: { permanent?: boolean; user?: any } = {}) => {
      try {
        const documents = useDocumentStore.getState().documents;
        const doc = documents[documentId];

        if (options.permanent) {
          // Call API for permanent delete
          await documentApi.permanentDelete(documentId);

          // Remove from subspace structure if document exists in store
          if (doc?.subspaceId) {
            removeDocumentFromSubspace(doc.subspaceId, documentId);
          }

          // Remove from store if document exists there
          if (doc) {
            useDocumentStore.setState((state) => {
              const newDocuments = { ...state.documents };
              delete newDocuments[documentId];
              return { documents: newDocuments };
            });
          }
        } else {
          // Call API for soft delete
          await documentApi.delete(documentId);

          // Soft delete - update store if document exists there
          if (doc) {
            useDocumentStore.setState((state) => ({
              documents: {
                ...state.documents,
                [documentId]: {
                  ...state.documents[documentId],
                  deletedAt: new Date().toISOString(),
                  lastModifiedById: options.user?.id || doc.lastModifiedById,
                  updatedAt: new Date().toISOString(),
                },
              },
            }));
          }
        }
      } catch (error) {
        console.error("Failed to delete document:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useUpdateDocument = () => {
  return useRequest(
    async (document: DocumentEntity) => {
      try {
        useDocumentStore.setState((state) => ({
          documents: { ...state.documents, [document.id]: document },
        }));
        return document;
      } catch (error) {
        console.error("Failed to update document:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

// Helper function to merge document updates with proper updatedAt normalization
// This ensures WebSocket updates compose with optimistic state instead of clobbering it
const mergeDocumentUpdate = (existingDocument: DocumentEntity, updatedFields: Partial<DocumentEntity>): DocumentEntity => {
  // Skip merge if update is stale (older than existing document)
  if (updatedFields.updatedAt && existingDocument.updatedAt) {
    const existingDate = new Date(existingDocument.updatedAt);
    const updateDate = new Date(updatedFields.updatedAt);

    if (updateDate <= existingDate) {
      // Update is stale, ignore it
      return existingDocument;
    }
  }

  const merged = { ...existingDocument, ...updatedFields };

  // Ensure updatedAt is properly normalized
  if (updatedFields.updatedAt) {
    merged.updatedAt = updatedFields.updatedAt;
  } else if (Object.keys(updatedFields).length > 0) {
    // If other fields were updated but no updatedAt provided, use current timestamp
    merged.updatedAt = new Date().toISOString();
  }

  return merged;
};

export const useHandleDocumentUpdate = () => {
  const { run: fetchDetail } = useFetchDocumentDetail();

  return useRequest(
    async (documentId: string, updatedFields: Partial<DocumentEntity>) => {
      try {
        const documents = useDocumentStore.getState().documents;
        const existing = documents[documentId];

        if (!existing) {
          // Document doesn't exist in store, fetch it
          await fetchDetail(documentId, { force: true, silent: true });
          return;
        }

        // Check if the update is actually newer (this check is now also in mergeDocumentUpdate)
        if (updatedFields.updatedAt) {
          const existingDate = new Date(existing.updatedAt);
          const updateDate = new Date(updatedFields.updatedAt);

          if (existingDate >= updateDate) {
            return; // No update needed - stale update
          }
        }

        // Merge the update with existing document
        const mergedDocument = mergeDocumentUpdate(existing, updatedFields);

        useDocumentStore.setState((state) => ({
          documents: { ...state.documents, [documentId]: mergedDocument },
        }));

        // Handle my-docs reordering - check if document moved in/out of my-docs
        if (existing) {
          const wasInMyDocs = !existing.subspaceId;
          const isInMyDocs = !mergedDocument.subspaceId;

          // If document structure changed (moved between my-docs and subspace)
          if (wasInMyDocs !== isInMyDocs) {
            // Trigger my-docs refresh if needed
            if (wasInMyDocs || isInMyDocs) {
              // Could emit a custom event or call a refresh method
            }
          } else if (wasInMyDocs && isInMyDocs) {
            // my doc order changed
          }

          // Handle subspace navigation tree updates
          if (
            mergedDocument.subspaceId &&
            (existing.title !== mergedDocument.title || existing.parentId !== mergedDocument.parentId || existing.index !== mergedDocument.index)
          ) {
            // Note: Navigation tree will be updated via WebSocket events
            // await useSubSpaceStore.getState().fetchNavigationTree(mergedDocument.subspaceId, {
            //   force: true,
            // });
          }
        }
      } catch (error: any) {
        console.error(`Failed to update document ${documentId}:`, error);
        if (error.status === 404 || error.status === 403) {
          useDocumentStore.setState((state) => {
            const newDocuments = { ...state.documents };
            delete newDocuments[documentId];
            return { documents: newDocuments };
          });
        }
      }
    },
    { manual: true },
  );
};

export const useHandleDocumentRemove = () => {
  return useRefCallback((documentId: string) => {
    const documents = useDocumentStore.getState().documents;
    const document = documents[documentId];
    if (document?.subspaceId) {
      removeDocumentFromSubspace(document.subspaceId, documentId);
    }
    useDocumentStore.setState((state) => {
      const newDocuments = { ...state.documents };
      delete newDocuments[documentId];
      return { documents: newDocuments };
    });
  });
};

export const useSetActiveDocument = () => {
  return useRefCallback((id?: string) => {
    useDocumentStore.setState({ activeDocumentId: id });
  });
};

export const useGetDocument = () => {
  const documents = useDocuments();
  return useRefCallback((id: string) => {
    return documents[id] || null;
  });
};

export const useGetDocumentAsNavigationNode = () => {
  const documents = useDocuments();
  return useRefCallback((documentId: string): NavigationNode | undefined => {
    const doc = documents[documentId];
    if (!doc) return undefined;

    const children = Object.values(documents)
      .filter((child) => child.parentId === documentId)
      .map((child) => {
        // Create child navigation node directly
        return {
          id: child.id,
          title: child.title,
          type: NavigationNodeType.Document,
          url: `/${child.id}`,
          children: [], // Simplified - children will be populated when needed
          parent: null,
        };
      })
      .filter(Boolean) as NavigationNode[];

    return {
      id: doc.id,
      title: doc.title,
      type: NavigationNodeType.Document,
      url: `/${doc.id}`,
      children,
      parent: null,
    };
  });
};

// Store selector hooks for current document
export const useCurrentDocumentFromStore = () => {
  const documents = useDocuments();
  const activeDocumentId = useActiveDocumentId();
  return useMemo(() => {
    return activeDocumentId ? documents[activeDocumentId] : undefined;
  }, [documents, activeDocumentId]);
};

// Computed value hooks
export const useArchivedDocuments = () => {
  const documents = useDocuments();
  return useMemo(() => {
    return Object.values(documents).filter((doc) => !!doc.archivedAt);
  }, [documents]);
};

export const useDeletedDocuments = () => {
  const documents = useDocuments();
  return useMemo(() => {
    return Object.values(documents).filter((doc) => !!doc.deletedAt);
  }, [documents]);
};

export const useDraftDocuments = () => {
  const documents = useDocuments();
  return useMemo(() => {
    return Object.values(documents).filter((doc) => !doc.publishedAt);
  }, [documents]);
};

export const usePublishedDocuments = () => {
  const documents = useDocuments();
  return useMemo(() => {
    return Object.values(documents).filter((doc) => !!doc.publishedAt);
  }, [documents]);
};

export const useDocumentsInSubspace = () => {
  const documents = useDocuments();
  return useRefCallback((subspaceId: string) => {
    return Object.values(documents).filter((doc) => doc.subspaceId === subspaceId);
  });
};

export const useRootDocumentsInSubspace = () => {
  const documents = useDocuments();
  return useRefCallback((subspaceId: string) => {
    return Object.values(documents).filter((doc) => doc.subspaceId === subspaceId && !doc.parentId);
  });
};

export const usePublishedDocumentsInSubspace = () => {
  const documents = useDocuments();
  return useRefCallback((subspaceId: string) => {
    return Object.values(documents).filter((doc) => doc.subspaceId === subspaceId && !!doc.publishedAt);
  });
};

export const useDraftDocumentsInSubspace = () => {
  const documents = useDocuments();
  return useRefCallback((subspaceId: string) => {
    return Object.values(documents).filter((doc) => doc.subspaceId === subspaceId && !doc.publishedAt);
  });
};

export const useArchivedDocumentsInSubspace = () => {
  const documents = useDocuments();
  return useRefCallback((subspaceId: string) => {
    return Object.values(documents).filter((doc) => doc.subspaceId === subspaceId && !!doc.archivedAt);
  });
};

export const useChildDocuments = () => {
  const documents = useDocuments();
  return useRefCallback((parentId: string) => {
    return Object.values(documents).filter((doc) => doc.parentId === parentId);
  });
};

export const usePersonalRootDocuments = () => {
  const personalSubspace = usePersonalSubspace();
  return useMemo(() => {
    return personalSubspace?.navigationTree || [];
  }, [personalSubspace]);
};

export const usePathToDocumentInMyDocs = () => {
  const documents = useDocuments();
  return useRefCallback((documentId: string) => {
    const myDocs = Object.values(documents).filter((doc) => !doc.subspaceId);

    let path: NavigationNode[] = [];

    const findPath = (targetId: string, currentPath: NavigationNode[] = []): boolean => {
      const doc = myDocs.find((d) => d.id === targetId);
      if (!doc) return false;

      const getDocumentAsNavigationNode = useGetDocumentAsNavigationNode();
      const node = getDocumentAsNavigationNode(doc.id);
      if (!node) return false;

      const newPath = [...currentPath, node];

      if (doc.id === documentId) {
        path = newPath;
        return true;
      }

      const children = myDocs.filter((d) => d.parentId === doc.id);
      for (const child of children) {
        if (findPath(child.id, newPath)) {
          return true;
        }
      }

      return false;
    };

    const rootDocs = myDocs.filter((doc) => !doc.parentId);
    for (const root of rootDocs) {
      if (findPath(root.id)) {
        break;
      }
    }

    return path;
  });
};

// Helper function hooks
export const useIsArchived = () => {
  return useRefCallback((doc: DocumentEntity) => !!doc.archivedAt);
};

export const useIsDeleted = () => {
  return useRefCallback((doc: DocumentEntity) => !!doc.deletedAt);
};

export const useIsDraft = () => {
  return useRefCallback((doc: DocumentEntity) => !doc.publishedAt);
};

export const useIsPublished = () => {
  return useRefCallback((doc: DocumentEntity) => !!doc.publishedAt);
};

export const useNeedsUpdate = () => {
  return useRefCallback((id: string, updatedAt: Date) => {
    const documents = useDocumentStore.getState().documents;
    const existing = documents[id];
    if (!existing) return true;

    const existingDate = new Date(existing.updatedAt);
    return existingDate < updatedAt;
  });
};

export const useFindAllChildDocumentIds = () => {
  const documents = useDocuments();
  return useRefCallback((documentId: string) => {
    const allDocs = Object.values(documents);
    const result: string[] = [];

    const findChildren = (parentId: string) => {
      const children = allDocs.filter((doc) => doc.parentId === parentId);
      children.forEach((child) => {
        result.push(child.id);
        findChildren(child.id);
      });
    };

    findChildren(documentId);
    return result;
  });
};

export const useFindChildDocuments = () => {
  const documents = useDocuments();
  return useRefCallback((documentId: string) => {
    return Object.values(documents).filter((doc) => doc.parentId === documentId);
  });
};

export const useFindDescendants = () => {
  const documents = useDocuments();
  return useRefCallback((documentId: string) => {
    const allDocs = Object.values(documents);
    const result: DocumentEntity[] = [];

    const findChildren = (parentId: string) => {
      const children = allDocs.filter((doc) => doc.parentId === parentId);
      children.forEach((child) => {
        result.push(child);
        findChildren(child.id);
      });
    };

    findChildren(documentId);
    return result;
  });
};

export const useCurrentDocumentId = () => {
  const { docId } = useParams();
  return docId;
};

export default useDocumentStore;
