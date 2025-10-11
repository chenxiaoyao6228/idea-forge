import { useMemo } from "react";
import DocHome from "./home";
import Loading from "@/components/ui/loading";
import Cover from "./cover";
import useUserStore from "@/stores/user-store";
import { useTranslation } from "react-i18next";
import { useTitle } from "react-use";
import DocumentHeader from "./components/doc-header";
import BackToTop from "@/components/ui/back-to-top";
import { getEnvVariable } from "@/lib/env";
import { Toolbar } from "./toolbar";
import TiptapEditor from "@/editor";
import { TableOfContent } from "./components/table-of-content";
import { Action, useAbilityCan } from "@/hooks/use-ability";
import { useCurrentDocumentFromStore, useCurrentDocumentId } from "@/stores/document-store";
import { useEditorStore } from "@/stores/editor-store";

export default function Doc() {
  const { t } = useTranslation();
  const activeDocumentId = useCurrentDocumentId();
  const collabToken = useUserStore((s) => s.userInfo?.collabToken);
  const currentDocument = useCurrentDocumentFromStore();

  // Get editor and toc items from store
  const editor = useEditorStore((state) => state.editor);
  const tocItems = useEditorStore((state) => state.tocItems);

  const isHomeDoc = false;

  // Type guard to ensure we have a proper document
  const isDocumentLoaded = currentDocument && !currentDocument.isLoading && "id" in currentDocument;

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  useTitle(`Idea Forge ${isDocumentLoaded && currentDocument?.title ? `- ${currentDocument.title}` : ""}`);

  // Move these up, use optional chaining to avoid errors
  const docAbilitySubject = useMemo(() => {
    if (!isDocumentLoaded || !currentDocument) return undefined;
    return {
      id: currentDocument.id,
      authorId: currentDocument.createdById,
    };
  }, [isDocumentLoaded, currentDocument?.id, currentDocument?.createdById]);

  const { can: canReadDoc } = useAbilityCan("Doc", Action.Read, docAbilitySubject);
  const { can: canUpdateDoc } = useAbilityCan("Doc", Action.Update, docAbilitySubject);
  const { can: canManageDoc } = useAbilityCan("Doc", Action.Manage, docAbilitySubject);

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

  if (!canReadDoc) {
    return <div className="text-center h-screen flex items-center justify-center text-lg">{t("You have no permission to view this document")}</div>;
  }

  return (
    <>
      <DocumentHeader />
      <div className="flex-auto overflow-y-auto">
        {currentDocument?.coverImage && <Cover cover={currentDocument.coverImage} editable={canUpdateDoc} />}
        <div className="md:max-w-3xl lg:max-w-4xl mx-auto px-10 relative">
          <Toolbar doc={currentDocument} editable={canUpdateDoc} />
          <TiptapEditor
            key={currentDocument.id}
            id={currentDocument.id!}
            editable={canUpdateDoc}
            collabToken={collabToken}
            collabWsUrl={getEnvVariable("CLIENT_COLLAB_WS_URL")}
          />
          <TableOfContent editor={editor} items={tocItems} />
        </div>
      </div>
      <BackToTop />
    </>
  );
}
