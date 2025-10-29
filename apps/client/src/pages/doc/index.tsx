import { useEffect } from "react";
import DocHome from "./home";
import Loading from "@idea/ui/base/loading";
import Cover from "./cover";
import useUserStore from "@/stores/user-store";
import { useTranslation } from "react-i18next";
import { useTitle } from "react-use";
import DocumentHeader from "./components/doc-header";
import BackToTop from "@/components/back-to-top";
import { getEnvVariable } from "@/lib/env";
import { Toolbar } from "./toolbar";
import TiptapEditor from "@/editor";
import { TableOfContent } from "./components/table-of-content";
import { useDocumentPermissions } from "@/hooks/permissions";
import { useCurrentDocumentFromStore, useCurrentDocumentId } from "@/stores/document-store";
import { useEditorStore } from "@/stores/editor-store";
import useUIStore from "@/stores/ui-store";
import { CommentsSidebar } from "@/components/comments";
import { useSearchParams } from "react-router-dom";

export default function Doc() {
  const { t } = useTranslation();
  const activeDocumentId = useCurrentDocumentId();
  const collabToken = useUserStore((s) => s.userInfo?.collabToken);
  const currentDocument = useCurrentDocumentFromStore();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get editor and toc items from store
  const editor = useEditorStore((state) => state.editor);
  const tocItems = useEditorStore((state) => state.tocItems);
  const commentsSidebarOpen = useUIStore((state) => state.commentsSidebarOpen);
  const setCommentsSidebarOpen = useUIStore((state) => state.setCommentsSidebarOpen);
  const setFocusedCommentId = useUIStore((state) => state.setFocusedCommentId);

  const isHomeDoc = false;

  // Type guard to ensure we have a proper document
  const isDocumentLoaded = currentDocument && !currentDocument.isLoading && "id" in currentDocument;

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  useTitle(`Idea Forge ${isDocumentLoaded && currentDocument?.title ? `- ${currentDocument.title}` : ""}`);

  // Check document permissions
  const { canReadDocument, canUpdateDocument } = useDocumentPermissions(isDocumentLoaded ? currentDocument : null);

  // Handle commentId URL parameter (from notification clicks)
  useEffect(() => {
    const commentId = searchParams.get("commentId");

    if (commentId) {
      // Open comments sidebar
      setCommentsSidebarOpen(true);

      // Set focused comment to scroll to it
      setFocusedCommentId(commentId);

      // Clean up URL parameter after handling it
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("commentId");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setCommentsSidebarOpen, setFocusedCommentId, setSearchParams]);

  // Handle loading state
  if (currentDocument?.isLoading) {
    return (
      <div className="w-full h-full absolute top-0 left-0 ">
        <Loading size="lg" fullScreen id="doc" />
      </div>
    );
  }

  if (isHomeDoc) {
    return <DocHome />;
  }

  if (!activeDocumentId || !isDocumentLoaded || currentDocument?.id === null) {
    return null;
  }

  if (!collabToken) {
    return null;
  }

  if (!canReadDocument) {
    return <div className="text-center h-screen flex items-center justify-center text-lg">{t("You have no permission to view this document")}</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <DocumentHeader />
      <div className="flex flex-1 overflow-hidden ">
        {/* Article section */}
        <div className="flex-1 relative h-[calc(100vh-48px)] border border-red">
          <div id="WORK_CONTENT_SCROLL_CONTAINER" className="absolute inset-0 overflow-y-auto">
            {currentDocument?.coverImage && <Cover cover={currentDocument.coverImage} editable={canUpdateDocument} />}
            <div className="md:max-w-3xl lg:max-w-4xl mx-auto px-10 relative">
              <Toolbar doc={currentDocument} editable={canUpdateDocument} />
              <TiptapEditor
                key={currentDocument.id}
                id={currentDocument.id!}
                editable={canUpdateDocument}
                collabToken={collabToken}
                collabWsUrl={getEnvVariable("CLIENT_COLLAB_WS_URL")}
              />
            </div>
          </div>
          {/* Table of content - absolute positioned within article section */}
          <TableOfContent editor={editor} items={tocItems} />
        </div>

        {/* Comment sidebar */}
        {commentsSidebarOpen && (
          <div className="w-[400px] flex-shrink-0 border-l">
            <CommentsSidebar documentId={currentDocument.id!} open={commentsSidebarOpen} />
          </div>
        )}
      </div>
      {/* Back to top - fixed positioned globally */}
      <BackToTop />
    </div>
  );
}
