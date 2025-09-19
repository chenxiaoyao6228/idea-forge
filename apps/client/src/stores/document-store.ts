import { create } from "zustand";
import { useMemo } from "react";
import useRequest from "@ahooksjs/use-request";
import { toast } from "sonner";
import { CoverImage, DocTypeSchema, DocVisibilitySchema, SubspaceTypeSchema } from "@idea/contracts";
import { NavigationNode, NavigationNodeType } from "@idea/contracts";
import { documentApi } from "@/apis/document";
import useSubSpaceStore, { getPersonalSubspace } from "./subspace";
import useWorkspaceStore from "./workspace";
import useAbilityStore from "./ability-store";
import { useRefCallback } from "@/hooks/use-ref-callback";

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
  [key: string]: any;
}

interface FetchOptions {
  force?: boolean;
  prefetch?: boolean;
  shareId?: string;
  silent?: boolean;
}

interface FetchDetailResult {
  data: { document: DocumentEntity; workspace?: any; sharedTree?: any };
  permissions?: any;
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
  return useRequest(
    async (id: string, options: FetchOptions = {}) => {
      try {
        // Note: Loading state is handled by useRequest

        const { data, permissions } = (await documentApi.getDocument(id)) as FetchDetailResult;

        if (!data.document) {
          throw new Error("Document not available");
        }

        // Update store
        useDocumentStore.setState((state) => ({
          documents: { ...state.documents, [data.document.id]: data.document },
        }));

        // Update shared cache if needed
        if (data.sharedTree || data.workspace) {
          useDocumentStore.setState((state) => ({
            sharedCache: {
              ...state.sharedCache,
              [id]: { sharedTree: data.sharedTree, workspace: data.workspace },
            },
          }));
        }

        // Only set active states if not in silent mode
        if (!options.silent) {
          useDocumentStore.setState({ activeDocumentId: data.document.id });
          if (data.document.subspaceId) {
            useSubSpaceStore.getState().setActiveSubspace(data.document.subspaceId);
          }
        }

        return {
          data: {
            document: data.document,
            sharedTree: data.sharedTree,
            workspace: data.workspace,
          },
        };
      } catch (error) {
        console.error("Failed to fetch document detail:", error);
        throw error;
      } finally {
        // Note: Loading state is handled by useRequest
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

        // Note: Loading state is handled by useRequest

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

        if (response.permissions) {
          // Convert permissions to ability entities and update store directly
          const entities = Object.entries(response.permissions).map(([id, abilities]) => ({
            id,
            abilities: { ...{ read: false, update: false, delete: false, share: false, comment: false }, ...(abilities as Record<string, boolean>) },
          }));
          useAbilityStore.setState((state) => {
            const newAbilities = { ...state.abilities };
            entities.forEach((entity) => {
              newAbilities[entity.id] = entity;
            });
            return { abilities: newAbilities };
          });
        }
      } catch (error) {
        console.error("Failed to fetch children:", error);
        throw error;
      } finally {
        // Note: Loading state is handled by useRequest
      }
    },
    { manual: true },
  );
};

export const useCreateDocument = () => {
  return useRequest(
    async ({ title, parentId, subspaceId }: CreateDocumentParams) => {
      try {
        // Note: Loading state is handled by useRequest

        const workspaceId = useWorkspaceStore.getState().currentWorkspace?.id;
        if (!workspaceId) throw new Error("No active workspace");

        const isPrivateSubspace = subspaceId ? useSubSpaceStore.getState().entities[subspaceId]?.type === SubspaceTypeSchema.enum.PERSONAL : false;

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
      } finally {
        // Note: Loading state is handled by useRequest
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

        if (res.permissions) {
          // Convert permissions to ability entities and update store directly
          const entities = Object.entries(res.permissions).map(([id, abilities]) => ({
            id,
            abilities: { ...{ read: false, update: false, delete: false, share: false, comment: false }, ...(abilities as Record<string, boolean>) },
          }));
          useAbilityStore.setState((state) => {
            const newAbilities = { ...state.abilities };
            entities.forEach((entity) => {
              newAbilities[entity.id] = entity;
            });
            return { abilities: newAbilities };
          });
        }
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

        // Note: Loading state is handled by useRequest

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
        useSubSpaceStore.getState().addDocument(subspaceId, doc);
      } catch (error) {
        console.error("Failed to publish document:", error);
        throw error;
      } finally {
        // Note: Loading state is handled by useRequest
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

        // Note: Loading state is handled by useRequest

        // Remove from subspace structure
        if (doc.subspaceId) {
          useSubSpaceStore.getState().removeDocument(doc.subspaceId, documentId);
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
      } finally {
        // Note: Loading state is handled by useRequest
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

        // Note: Loading state is handled by useRequest

        // Remove from subspace structure
        if (doc.subspaceId) {
          useSubSpaceStore.getState().removeDocument(doc.subspaceId, documentId);
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
      } finally {
        // Note: Loading state is handled by useRequest
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

        // Note: Loading state is handled by useRequest

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
          useSubSpaceStore.getState().addDocument(subspaceId, doc);
        }
      } catch (error) {
        console.error("Failed to restore document:", error);
        throw error;
      } finally {
        // Note: Loading state is handled by useRequest
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
        if (!doc) throw new Error("Document not found");

        // Note: Loading state is handled by useRequest

        if (options.permanent) {
          // Remove from subspace structure
          if (doc.subspaceId) {
            useSubSpaceStore.getState().removeDocument(doc.subspaceId, documentId);
          }

          // Remove from store
          useDocumentStore.setState((state) => {
            const newDocuments = { ...state.documents };
            delete newDocuments[documentId];
            return { documents: newDocuments };
          });
        } else {
          // Soft delete
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
      } catch (error) {
        console.error("Failed to delete document:", error);
        throw error;
      } finally {
        // Note: Loading state is handled by useRequest
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

export const useHandleDocumentUpdate = () => {
  const { run: fetchDetail } = useFetchDocumentDetail();

  return useRequest(
    async (documentId: string, updatedAt?: string) => {
      try {
        const documents = useDocumentStore.getState().documents;
        const existing = documents[documentId];

        if (existing && updatedAt && existing.updatedAt === updatedAt) {
          return;
        }

        // Use silent mode to avoid setting active states during batch updates
        await fetchDetail(documentId, { force: true, silent: true });

        const updatedDocument = useDocumentStore.getState().documents[documentId];

        // Handle my-docs reordering - check if document moved in/out of my-docs
        if (updatedDocument && existing) {
          const wasInMyDocs = !existing.subspaceId;
          const isInMyDocs = !updatedDocument.subspaceId;

          // If document structure changed (moved between my-docs and subspace)
          if (wasInMyDocs !== isInMyDocs) {
            // Trigger my-docs refresh if needed
            if (wasInMyDocs || isInMyDocs) {
              // Could emit a custom event or call a refresh method
              console.log(`Document ${documentId} moved between my-docs and subspace`);
            }
          } else {
            // my doc order changed
            console.log(`Document ${documentId} order changed in my-docs`);
            useDocumentStore.setState((state) => ({
              documents: { ...state.documents, [documentId]: updatedDocument },
            }));
          }

          // Handle subspace navigation tree updates
          if (
            updatedDocument.subspaceId &&
            (existing.title !== updatedDocument.title || existing.parentId !== updatedDocument.parentId || existing.index !== updatedDocument.index)
          ) {
            await useSubSpaceStore.getState().fetchNavigationTree(updatedDocument.subspaceId, {
              force: true,
            });
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
      useSubSpaceStore.getState().removeDocument(document.subspaceId, documentId);
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

export const useActiveDocument = () => {
  const documents = useDocuments();
  const activeDocumentId = useActiveDocumentId();
  return useMemo(() => {
    return activeDocumentId ? documents[activeDocumentId] : undefined;
  }, [documents, activeDocumentId]);
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
  return useMemo(() => {
    const personalSubspace = getPersonalSubspace(useSubSpaceStore.getState());
    return personalSubspace?.navigationTree || [];
  }, []);
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

      // 查找子文档
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

// Legacy compatibility - keep for backward compatibility during transition
export const documentSelectors = {
  selectAll: (state: any) => Object.values(state.documents || {}),
  selectById: (state: any, id: string) => state.documents?.[id] || null,
};

export default useDocumentStore;
