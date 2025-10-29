import { useMemo } from "react";
import type { PureAbility } from "@casl/ability";
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

  // Computed convenience flags
  /** User can edit document - computed as canUpdateDocument OR canManageDocument */
  canEditDocument: boolean;

  // Loading state
  /** Document permissions are still loading (documentId not available) */
  isLoadingDocumentPermissions: boolean;

  // Raw ability object for advanced usage
  /** CASL ability object for advanced permission checks */
  documentAbility: PureAbility;
}

type DocumentObject = {
  id: string;
  createdById?: string;
  authorId?: string;
};

type DocumentConfig = {
  documentId?: string;
  authorId?: string;
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
      };
    }

    // Handle config object (has 'documentId' field or is empty)
    return {
      documentId: input.documentId,
      authorId: input.authorId,
    };
  }, [input]);

  // Build CASL subject for ability checks
  const subject = useMemo(() => {
    if (!config?.documentId) return undefined;

    return {
      id: config.documentId,
      ...(config.authorId && { authorId: config.authorId }),
    };
  }, [config]);

  // Check all document permissions
  const { can: canReadDocument, ability: documentAbility } = useAbilityCan("Doc", Action.Read, subject);
  const { can: canUpdateDocument } = useAbilityCan("Doc", Action.Update, subject);
  const { can: canDeleteDocument } = useAbilityCan("Doc", Action.Delete, subject);
  const { can: canManageDocument } = useAbilityCan("Doc", Action.Manage, subject);
  const { can: canShareDocument } = useAbilityCan("Doc", Action.Share, subject);
  const { can: canCommentDocument } = useAbilityCan("Doc", Action.Comment, subject);
  const { can: canArchiveDocument } = useAbilityCan("Doc", Action.Archive, subject);
  const { can: canRestoreDocument } = useAbilityCan("Doc", Action.Restore, subject);
  const { can: canPublishDocument } = useAbilityCan("Doc", Action.Publish, subject);
  const { can: canUnpublishDocument } = useAbilityCan("Doc", Action.Unpublish, subject);

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

    // Computed convenience flags
    canEditDocument: canUpdateDocument || canManageDocument,

    // Loading state
    isLoadingDocumentPermissions: !subject,

    // Raw ability for advanced usage
    documentAbility,
  };
}
