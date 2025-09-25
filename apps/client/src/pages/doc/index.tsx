import { useMemo } from "react";
import DocHome from "./home";
import Loading from "@/components/ui/loading";
import Cover from "./cover";
import useUserStore from "@/stores/user-store";
import { useTranslation } from "react-i18next";
import { useTitle } from "react-use";
import DocumentHeader from "./components/doc-header";
import BackToTop from "@/components/ui/back-to-top";
import { useCurrentDocument, useCurrentDocumentId } from "@/hooks/use-current-document";
import { getEnvVariable } from "@/lib/env";
import { Toolbar } from "./toolbar";
import TiptapEditor from "@/editor";
import { TableOfContent } from "./components/table-of-content";
import { Action, useAbilityCan } from "@/hooks/use-ability";

export default function Doc() {
  const { t } = useTranslation();
  const userId = useUserStore((s) => s.userInfo?.id);
  const activeDocumentId = useCurrentDocumentId();
  const collabToken = useUserStore((s) => s.userInfo?.collabToken);
  const currentDocument = useCurrentDocument();

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

  console.log("[current doc permission]: canManageDoc, canUpdateDoc, canReadDoc", canManageDoc, canUpdateDoc, canReadDoc);

  // Handle loading state
  if (currentDocument?.isLoading) {
    return <Loading />;
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
          <TiptapEditor id={currentDocument.id!} editable={canUpdateDoc} collabToken={collabToken} collabWsUrl={getEnvVariable("CLIENT_COLLAB_WS_URL")} />
          <TableOfContent />
        </div>
      </div>
      <BackToTop />
    </>
  );
}
