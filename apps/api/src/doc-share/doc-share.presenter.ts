import { DocShare } from "@idea/contracts";
import { ShareResponse } from "@idea/contracts";

export function presentDocShare(
  docShare: DocShare & {
    doc: {
      id: string;
      title: string;
      workspace: {
        id: string;
        name: string;
        description: string | null;
        avatar: string | null;
      };
      subspace: {
        id: string;
        name: string;
        description: string | null;
        avatar: string | null;
      } | null;
    };
    author: {
      id: string;
      email: string;
      displayName: string | null;
    };
    sharedTo: {
      id: string;
      email: string;
      displayName: string | null;
    };
  },
): ShareResponse {
  return {
    id: docShare.id,
    documentId: docShare.docId,
    document: {
      id: docShare.doc.id,
      title: docShare.doc.title,
      workspace: docShare.doc.workspace,
      subspace: docShare.doc.subspace,
    },
    author: {
      id: docShare.author.id,
      email: docShare.author.email,
      displayName: docShare.author.displayName,
    },
    sharedTo: {
      id: docShare.sharedTo.id,
      email: docShare.sharedTo.email,
      displayName: docShare.sharedTo.displayName,
    },
    permission: docShare.permission,
    includeChildDocuments: docShare.includeChildDocuments,
    published: docShare.published,
    urlId: docShare.urlId,
    createdAt: docShare.createdAt.toISOString(),
    updatedAt: docShare.updatedAt.toISOString(),
  };
}
