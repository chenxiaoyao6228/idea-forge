import { useMemo } from "react";
import type { MongoAbility } from "@casl/ability";
import { Action } from "@idea/contracts";
import { useAbilityCan } from "@/hooks/use-ability";

interface DocumentPermissions {
  /** User can view the document */
  canReadDocument: boolean;
  /** User can edit the document content */
  canUpdateDocument: boolean;
  /** User can delete the document */
  canDeleteDocument: boolean;
  /** User has full management rights (highest permission) */
  canManageDocument: boolean;
  /** User can share the document with others */
  canShareDocument: boolean;
  /** User can add comments to the document */
  canCommentDocument: boolean;
  /** User can archive (soft delete) the document */
  canArchiveDocument: boolean;
  /** User can restore archived documents */
  canRestoreDocument: boolean;
  /** User can publish documents */
  canPublishDocument: boolean;
  /** User can unpublish documents (revert to draft) */
  canUnpublishDocument: boolean;
  /** User can permanently delete documents (destructive action) */
  canPermanentDeleteDocument: boolean;
  /** User can duplicate documents */
  canDuplicateDocument: boolean;

  // Computed convenience flags
  /** User can edit document - computed as canUpdateDocument OR canManageDocument */
  canEditDocument: boolean;

  // Loading state
  /** Document permissions are still loading (documentId not available) */
  isLoadingDocumentPermissions: boolean;

  // Raw ability object for advanced usage
  /** CASL ability object for advanced permission checks */
  documentAbility: MongoAbility;
}

type DocumentObject = {
  id: string;
  createdById?: string;
  authorId?: string;
  workspaceId?: string;
  subspaceId?: string | null;
};

type DocumentConfig = {
  documentId?: string;
  authorId?: string;
  workspaceId?: string;
  subspaceId?: string | null;
};

/**
 * Hook for checking document-level permissions
 *
 * Provides convenient, type-safe permission checking for documents.
 * Supports two input patterns for flexibility:
 *
 * **Pattern 1 (Recommended):** Pass full document object
 * ```typescript
 * const document = useDocumentStore(state => state.currentDocument);
 * const { canUpdate, canManage, canEdit } = useDocumentPermissions(document);
 * ```
 *
 * **Pattern 2:** Pass configuration object with explicit fields
 * ```typescript
 * const { documentId } = useParams();
 * const { canUpdate } = useDocumentPermissions({ documentId });
 * ```
 */
export function useDocumentPermissions(input: DocumentObject | DocumentConfig | null | undefined): DocumentPermissions {
  // Normalize input to consistent config format
  const config = useMemo(() => {
    if (!input) return undefined;

    // Handle document object (has 'id' field)
    if ("id" in input) {
      return {
        documentId: input.id,
        authorId: input.createdById || input.authorId,
        workspaceId: input.workspaceId,
        subspaceId: input.subspaceId,
      };
    }

    // Handle config object (has 'documentId' field or is empty)
    return {
      documentId: input.documentId,
      authorId: input.authorId,
      workspaceId: input.workspaceId,
      subspaceId: input.subspaceId,
    };
  }, [input]);

  // Build CASL subjects for ability checks
  // Note: We need separate subject objects for "Doc" and "DocContent" because CASL's subject()
  // function caches the subject type on the object, and we can't use the same object for both
  const contentSubject = useMemo(() => {
    if (!config?.documentId) return undefined;
    return { id: config.documentId };
  }, [config]);

  const docSubject = useMemo(() => {
    if (!config?.documentId) return undefined;

    return {
      id: config.documentId,
      ...(config.authorId && { authorId: config.authorId }),
      ...(config.workspaceId && { workspaceId: config.workspaceId }),
      ...(config.subspaceId !== undefined && { subspaceId: config.subspaceId }),
    };
  }, [config]);

  // Content permissions: Check against "DocContent" (fetched per-document due to inheritance)
  // These permissions change frequently based on parent permissions and direct grants
  const { can: canReadDocument, ability: documentAbility } = useAbilityCan("DocContent", Action.Read, contentSubject);
  const { can: canUpdateDocument } = useAbilityCan("DocContent", Action.Update, contentSubject);
  const { can: canCommentDocument } = useAbilityCan("DocContent", Action.Comment, contentSubject);
  const { can: canManageDocument } = useAbilityCan("DocContent", Action.Manage, contentSubject);

  // Structural permissions: Check against "Doc" (global role-based rules from login)
  // These are stable and determined by workspace/subspace roles
  const { can: canDeleteDocument } = useAbilityCan("Doc", Action.Delete, docSubject);
  const { can: canRestoreDocument } = useAbilityCan("Doc", Action.Restore, docSubject);
  const { can: canArchiveDocument } = useAbilityCan("Doc", Action.Archive, docSubject);
  const { can: canPermanentDeleteDocument } = useAbilityCan("Doc", Action.PermanentDelete, docSubject);
  const { can: canPublishDocument } = useAbilityCan("Doc", Action.Publish, docSubject);
  const { can: canUnpublishDocument } = useAbilityCan("Doc", Action.Unpublish, docSubject);
  const { can: canShareDocument } = useAbilityCan("Doc", Action.Share, docSubject);
  const { can: canDuplicateDocument } = useAbilityCan("Doc", Action.Duplicate, docSubject);

  return {
    // Raw permissions
    canReadDocument,
    canUpdateDocument,
    canDeleteDocument,
    canManageDocument,
    canShareDocument,
    canCommentDocument,
    canArchiveDocument,
    canRestoreDocument,
    canPublishDocument,
    canUnpublishDocument,
    canPermanentDeleteDocument,
    canDuplicateDocument,

    // Computed convenience flags
    canEditDocument: canUpdateDocument || canManageDocument,

    // Loading state
    isLoadingDocumentPermissions: !docSubject,

    // Raw ability for advanced usage
    documentAbility,
  };
}
